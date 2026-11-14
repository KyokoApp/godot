extends Node
## Sistem update konten (Fase 0.5). Autoload bernama "UpdateManager".
##
## Alur:
##   1. fetch_manifest()  : ambil manifest.json dari server (GitHub Release).
##   2. plan(manifest)    : tentukan paket yang berubah (sha256 beda / file hilang).
##   3. install(plan)     : download per chunk (Range, bisa dilanjutkan), validasi
##                          SHA256, rename .part -> final, load dengan load_resource_pack,
##                          baru hapus versi lama. Versi lama tidak dihapus sebelum
##                          versi baru tervalidasi dan termuat.
##   4. load_installed_packs(): dipanggil setiap start, supaya paket terpasang tetap
##                          dimuat walau offline.
##
## Paket hanya boleh berisi aset (scene, tekstur, mesh, shader resource, audio).
## Jangan menaruh kode GDScript baru di paket (aturan App Store iOS).

signal progress_changed(fraction: float, text: String)

const CONTENT_DIR: String = "user://content"
const INSTALLED_PATH: String = "user://content/installed.json"
const CHUNK_SIZE: int = 4 * 1024 * 1024
const MAX_REQUEST_RETRIES: int = 5
const MAX_PACK_ATTEMPTS: int = 2
const REQUEST_TIMEOUT: float = 30.0

## URL manifest di GitHub Release. Bisa diubah lewat kode (dipakai tes).
var manifest_url: String = "https://github.com/KyokoApp/godot/releases/download/content-latest/manifest.json"

## Statistik untuk tes dan log.
var stats: Dictionary = {"requests": 0, "resumed_bytes": 0, "downloaded_bytes": 0, "packs_installed": 0}

var _http: HTTPRequest


func _ready() -> void:
	_http = HTTPRequest.new()
	_http.timeout = REQUEST_TIMEOUT
	add_child(_http)
	DirAccess.make_dir_recursive_absolute(CONTENT_DIR)


## Ambil dan validasi manifest. Mengembalikan { ok, manifest, error }.
func fetch_manifest() -> Dictionary:
	var body: PackedByteArray = PackedByteArray()
	var last_error: String = ""
	for attempt: int in range(MAX_REQUEST_RETRIES):
		var res: Array = await _request(manifest_url, PackedStringArray())
		if res[0] == HTTPRequest.RESULT_SUCCESS and res[1] == 200:
			body = res[3]
			break
		last_error = "gagal ambil manifest (kode %d, hasil %d)" % [res[1], res[0]]
		await get_tree().create_timer(_backoff(attempt)).timeout
	if body.is_empty():
		return {"ok": false, "manifest": {}, "error": last_error}

	var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
	var err: String = UpdateLogic.validate_manifest(parsed)
	if err != "":
		return {"ok": false, "manifest": {}, "error": "manifest rusak: " + err}
	return {"ok": true, "manifest": parsed, "error": ""}


## Daftar paket yang perlu didownload untuk manifest ini.
func plan(manifest: Dictionary) -> Array:
	return UpdateLogic.plan_updates(load_installed(), manifest["packs"], _file_exists)


## Ruang kosong (byte) di penyimpanan user. -1 jika tidak diketahui.
func free_space_bytes() -> int:
	var dir: DirAccess = DirAccess.open("user://")
	if dir == null:
		return -1
	return dir.get_space_left()


## Download dan pasang semua paket di plan. Mengembalikan { ok, error }.
func install(entries: Array) -> Dictionary:
	var total: int = UpdateLogic.total_bytes(entries)
	var done_before: int = 0
	for entry: Variant in entries:
		var e: Dictionary = entry
		var error: String = await _install_pack(e, done_before, total)
		if error != "":
			return {"ok": false, "error": error}
		done_before += int(e["size"])
	progress_changed.emit(1.0, "Update selesai")
	return {"ok": true, "error": ""}


## Muat semua paket yang tercatat terpasang. Dipanggil saat start (offline-first).
func load_installed_packs() -> int:
	var loaded: int = 0
	var installed: Dictionary = load_installed()
	for pack_name: String in installed:
		var file_path: String = str(installed[pack_name].get("file", ""))
		if _file_exists(file_path) and ProjectSettings.load_resource_pack(file_path, true):
			loaded += 1
	return loaded


func has_installed(pack_name: String) -> bool:
	var info: Dictionary = load_installed().get(pack_name, {})
	return _file_exists(str(info.get("file", "")))


func load_installed() -> Dictionary:
	if not FileAccess.file_exists(INSTALLED_PATH):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(INSTALLED_PATH))
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}


func _save_installed(data: Dictionary) -> void:
	DirAccess.make_dir_recursive_absolute(CONTENT_DIR)
	var tmp_path: String = INSTALLED_PATH + ".tmp"
	var f: FileAccess = FileAccess.open(tmp_path, FileAccess.WRITE)
	f.store_string(JSON.stringify(data, "\t"))
	f.close()
	if FileAccess.file_exists(INSTALLED_PATH):
		DirAccess.remove_absolute(INSTALLED_PATH)
	DirAccess.rename_absolute(tmp_path, INSTALLED_PATH)


func _install_pack(entry: Dictionary, done_before: int, total: int) -> String:
	var pack_name: String = entry["name"]
	var final_path: String = _final_path(entry)
	var part_path: String = final_path + ".part"

	for attempt: int in range(MAX_PACK_ATTEMPTS):
		var error: String = await _download_to_part(entry, part_path, done_before, total)
		if error != "":
			return error
		var sha: String = FileAccess.get_sha256(part_path)
		if sha != entry["sha256"]:
			# File korup atau tidak cocok: hapus dan ulangi dari nol.
			DirAccess.remove_absolute(part_path)
			if attempt == MAX_PACK_ATTEMPTS - 1:
				return "hash paket '%s' tidak cocok setelah %d percobaan" % [pack_name, MAX_PACK_ATTEMPTS]
			continue

		# Tervalidasi: pasang. Simpan versi lama dulu untuk dihapus setelah berhasil.
		var old: Dictionary = load_installed().get(pack_name, {})
		if FileAccess.file_exists(final_path):
			DirAccess.remove_absolute(final_path)
		var renamed: Error = DirAccess.rename_absolute(part_path, final_path)
		if renamed != OK:
			return "gagal memindahkan paket '%s' (error %d)" % [pack_name, renamed]
		if not ProjectSettings.load_resource_pack(final_path, true):
			DirAccess.remove_absolute(final_path)
			return "gagal memuat paket '%s'" % pack_name

		var data: Dictionary = load_installed()
		data[pack_name] = {"version": entry["version"], "sha256": entry["sha256"], "file": final_path}
		_save_installed(data)
		if old.has("file") and str(old["file"]) != final_path and FileAccess.file_exists(str(old["file"])):
			DirAccess.remove_absolute(str(old["file"]))
		stats["packs_installed"] += 1
		return ""
	return "unexpected"


## Download paket ke file .part secara bertahap. Melanjutkan dari ukuran .part yang ada.
func _download_to_part(entry: Dictionary, part_path: String, done_before: int, total: int) -> String:
	var pack_name: String = entry["name"]
	var size: int = int(entry["size"])
	var url: String = entry["url"]

	var offset: int = 0
	if FileAccess.file_exists(part_path):
		offset = FileAccess.open(part_path, FileAccess.READ).get_length()
	if offset > size:
		DirAccess.remove_absolute(part_path)
		offset = 0
	if offset > 0:
		stats["resumed_bytes"] += offset

	var retries: int = 0
	while offset < size:
		var range_end: int = mini(offset + CHUNK_SIZE, size) - 1
		var headers: PackedStringArray = PackedStringArray(["Range: bytes=%d-%d" % [offset, range_end]])
		var res: Array = await _request(url, headers)
		var code: int = res[1]
		var body: PackedByteArray = res[3]

		if res[0] == HTTPRequest.RESULT_SUCCESS and code == 206 and body.size() > 0:
			_write_at(part_path, offset, body)
			offset += body.size()
			stats["downloaded_bytes"] += body.size()
			retries = 0
		elif res[0] == HTTPRequest.RESULT_SUCCESS and code == 200:
			# Server mengabaikan Range dan mengirim seluruh file.
			if offset > 0:
				DirAccess.remove_absolute(part_path)
				offset = 0
				continue
			if body.size() > size:
				return "ukuran paket '%s' lebih besar dari manifest" % pack_name
			_write_at(part_path, 0, body)
			offset = body.size()
			stats["downloaded_bytes"] += body.size()
			retries = 0
		else:
			retries += 1
			if retries > MAX_REQUEST_RETRIES:
				return "gagal download '%s' (kode %d, hasil %d). Koneksi terputus?" % [pack_name, code, res[0]]
			await get_tree().create_timer(_backoff(retries)).timeout
			continue

		var fraction: float = float(done_before + offset) / float(maxi(total, 1))
		progress_changed.emit(clampf(fraction, 0.0, 1.0),
			"Mengunduh %s %s (%s / %s)" % [pack_name, entry["version"],
				UpdateLogic.format_mb(done_before + offset), UpdateLogic.format_mb(total)])
	return ""


func _write_at(path: String, offset: int, data: PackedByteArray) -> void:
	var f: FileAccess
	if offset == 0 or not FileAccess.file_exists(path):
		f = FileAccess.open(path, FileAccess.WRITE)
	else:
		f = FileAccess.open(path, FileAccess.READ_WRITE)
	f.seek(offset)
	f.store_buffer(data)
	f.close()


## Satu request HTTP. Mengembalikan [result, code, headers, body].
func _request(url: String, headers: PackedStringArray) -> Array:
	stats["requests"] += 1
	var err: Error = _http.request(url, headers)
	if err != OK:
		return [HTTPRequest.RESULT_CANT_CONNECT, 0, PackedStringArray(), PackedByteArray()]
	var res: Array = await _http.request_completed
	return res


func _final_path(entry: Dictionary) -> String:
	var short_sha: String = str(entry["sha256"]).substr(0, 12)
	return "%s/%s-%s.pck" % [CONTENT_DIR, str(entry["name"]), short_sha]


func _file_exists(path: String) -> bool:
	return path != "" and FileAccess.file_exists(path)


func _backoff(attempt: int) -> float:
	return minf(0.5 * pow(2.0, attempt), 16.0)

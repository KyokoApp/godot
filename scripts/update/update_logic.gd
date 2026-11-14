class_name UpdateLogic
extends RefCounted
## Logika murni untuk sistem update konten (tanpa jaringan, tanpa node).
## Dipisah supaya bisa diuji headless. Lihat tests/update_tests.gd.

const MANIFEST_VERSION: int = 1


## Mengembalikan pesan error, atau "" jika manifest valid.
static func validate_manifest(manifest: Variant) -> String:
	if typeof(manifest) != TYPE_DICTIONARY:
		return "manifest bukan objek JSON"
	var data: Dictionary = manifest
	if int(data.get("manifest_version", -1)) != MANIFEST_VERSION:
		return "manifest_version tidak didukung"
	if typeof(data.get("packs")) != TYPE_ARRAY:
		return "field 'packs' tidak ada atau bukan daftar"
	var seen: Dictionary = {}
	for entry: Variant in data["packs"]:
		var err: String = validate_pack_entry(entry)
		if err != "":
			return err
		var pack_name: String = entry["name"]
		if seen.has(pack_name):
			return "nama paket ganda: " + pack_name
		seen[pack_name] = true
	return ""


## Mengembalikan pesan error, atau "" jika entri paket valid.
static func validate_pack_entry(entry: Variant) -> String:
	if typeof(entry) != TYPE_DICTIONARY:
		return "entri paket bukan objek"
	var e: Dictionary = entry
	for key: String in ["name", "version", "url", "sha256", "size"]:
		if not e.has(key):
			return "entri paket tanpa field '%s'" % key
	var pack_name: String = str(e["name"])
	if not pack_name.is_valid_filename() or pack_name.contains("/") or pack_name.contains(" "):
		return "nama paket tidak valid: " + pack_name
	var url: String = str(e["url"])
	if not (url.begins_with("https://") or url.begins_with("http://")):
		return "url paket harus http(s): " + pack_name
	var sha: String = str(e["sha256"])
	if sha.length() != 64 or not sha.is_valid_hex_number():
		return "sha256 tidak valid untuk paket: " + pack_name
	if int(e["size"]) <= 0:
		return "ukuran paket harus > 0: " + pack_name
	return ""


## Menentukan paket mana yang perlu didownload.
## installed: { name: { "sha256": String, "file": String } }
## remote_packs: Array of pack entries (sudah divalidasi).
## has_file: Callable(file_path: String) -> bool, untuk cek file lokal.
## Paket dianggap sudah terpasang jika sha256 sama dan file ada.
static func plan_updates(installed: Dictionary, remote_packs: Array, has_file: Callable) -> Array:
	var plan: Array = []
	for entry: Variant in remote_packs:
		var e: Dictionary = entry
		var pack_name: String = e["name"]
		var current: Dictionary = installed.get(pack_name, {})
		var up_to_date: bool = current.get("sha256", "") == e["sha256"] \
			and has_file.call(str(current.get("file", "")))
		if not up_to_date:
			plan.append(e)
	return plan


static func total_bytes(entries: Array) -> int:
	var total: int = 0
	for entry: Variant in entries:
		total += int((entry as Dictionary)["size"])
	return total


## Ukuran dalam MB untuk ditampilkan ke pengguna.
static func format_mb(bytes: int) -> String:
	return "%.1f MB" % (float(bytes) / 1048576.0)

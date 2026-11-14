extends SceneTree
## Tes headless sistem update konten (Fase 0.5).
## Jalankan: godot --headless --path . -s res://tests/update_tests.gd
## Membutuhkan server range di 127.0.0.1:8080 yang melayani res://build/test-serve
## (lihat tests/range_server.py dan .github/workflows/content-packs.yml).

const UpdateManagerScript = preload("res://scripts/update/update_manager.gd")
const BASE_URL: String = "http://127.0.0.1:8080"

var _passed: int = 0
var _failures: Array[String] = []
var _um  # UpdateManager instance (tanpa tipe supaya bisa memanggil _final_path)
var _serve_dir: String


func _initialize() -> void:
	# Tunggu satu frame: root window (SceneTree) belum berjalan saat _initialize.
	await process_frame
	_serve_dir = ProjectSettings.globalize_path("res://build/test-serve")  # lint:ignore res_path
	DirAccess.make_dir_recursive_absolute(_serve_dir + "/packs")
	DirAccess.make_dir_recursive_absolute(_serve_dir + "/src")
	await _run_all()
	print("")
	print("RESULT: %d passed, %d failed" % [_passed, _failures.size()])
	for failure: String in _failures:
		print("FAIL: " + failure)
	quit(0 if _failures.is_empty() else 1)


func _run_all() -> void:
	_test_pure_logic()
	_test_sha256()

	_um = UpdateManagerScript.new()
	root.add_child(_um)
	print("um inside tree: %s" % str(_um.is_inside_tree()))
	_um.manifest_url = BASE_URL + "/manifest.json"
	_reset_user_content()

	await _test_fresh_install_and_diff()
	await _test_resume_partial_download()
	await _test_corrupt_hash_rejected()
	await _test_offline_restart_loads_installed()
	await _test_missing_manifest_fails()


# ---------- unit ----------

func _test_pure_logic() -> void:
	_check(UpdateLogic.validate_manifest({}) != "", "manifest kosong ditolak")
	var good: Dictionary = _entry("ok", "1.0.0", "x")
	_check(UpdateLogic.validate_manifest({"manifest_version": 1, "packs": [good]}) == "", "manifest valid diterima")
	var bad_sha: Dictionary = good.duplicate()
	bad_sha["sha256"] = "abc"
	_check(UpdateLogic.validate_pack_entry(bad_sha) != "", "sha256 pendek ditolak")
	var bad_url: Dictionary = good.duplicate()
	bad_url["url"] = "ftp://x/y.pck"
	_check(UpdateLogic.validate_pack_entry(bad_url) != "", "url non-http ditolak")
	var zero: Dictionary = good.duplicate()
	zero["size"] = 0
	_check(UpdateLogic.validate_pack_entry(zero) != "", "ukuran 0 ditolak")
	var dup: Dictionary = {"manifest_version": 1, "packs": [good, good]}
	_check(UpdateLogic.validate_manifest(dup) != "", "nama paket ganda ditolak")
	var wrong_version: Dictionary = {"manifest_version": 9, "packs": [good]}
	_check(UpdateLogic.validate_manifest(wrong_version) != "", "manifest_version tidak didukung ditolak")

	var installed: Dictionary = {"a": {"sha256": good["sha256"], "file": "user://a.pck"}}
	var exists: Callable = func(p: String) -> bool: return p == "user://a.pck"
	var same: Dictionary = _entry("a", "1.0.0", "x")
	var changed: Dictionary = _entry("a", "1.1.0", "y")
	var fresh: Dictionary = _entry("b", "1.0.0", "z")
	_check(UpdateLogic.plan_updates(installed, [same], exists).is_empty(), "paket sama tidak didownload ulang")
	_check(UpdateLogic.plan_updates(installed, [changed], exists).size() == 1, "paket berubah didownload")
	_check(UpdateLogic.plan_updates(installed, [fresh], exists).size() == 1, "paket baru didownload")
	_check(UpdateLogic.plan_updates(installed, [same], func(_p: String) -> bool: return false).size() == 1,
		"file hilang didownload ulang")
	_check(UpdateLogic.format_mb(1048576) == "1.0 MB", "format MB benar")
	_check(same["sha256"] == good["sha256"], "helper entri konsisten")


func _test_sha256() -> void:
	var path: String = "user://sha_test.txt"
	var f: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	f.store_string("abc")
	f.close()
	_check(FileAccess.get_sha256(path) == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		"SHA256 'abc' sesuai referensi")


# ---------- integration ----------

func _test_fresh_install_and_diff() -> void:
	var alpha1: Dictionary = _make_pack("alpha", "1.0.0", "alpha v1")
	_write_manifest([alpha1])
	var fetched: Dictionary = await _um.fetch_manifest()
	_check(fetched["ok"], "manifest diambil dari server: " + str(fetched["error"]))
	var plan: Array = _um.plan(fetched["manifest"])
	_check(plan.size() == 1 and plan[0]["name"] == "alpha", "install awal: hanya alpha yang direncanakan")
	var result: Dictionary = await _um.install(plan)
	_check(result["ok"], "install alpha berhasil: " + str(result["error"]))
	_check(_um.has_installed("alpha"), "alpha tercatat terpasang")
	_check(FileAccess.file_exists("res://test_marker_alpha.txt"), "alpha termuat (marker ada di res://)")
	_check(FileAccess.get_file_as_string("res://test_marker_alpha.txt") == "alpha v1", "isi alpha v1 benar")

	# alpha tidak berubah, beta baru: hanya beta yang boleh didownload.
	var beta1: Dictionary = _make_pack("beta", "1.0.0", "beta v1")
	_write_manifest([alpha1, beta1])
	fetched = await _um.fetch_manifest()
	plan = _um.plan(fetched["manifest"])
	_check(plan.size() == 1 and plan[0]["name"] == "beta", "update: alpha tidak disentuh, hanya beta")
	result = await _um.install(plan)
	_check(result["ok"], "install beta berhasil: " + str(result["error"]))
	_check(FileAccess.get_file_as_string("res://test_marker_beta.txt") == "beta v1", "isi beta v1 benar")  # lint:ignore res_path

	# Tidak ada perubahan: plan kosong.
	fetched = await _um.fetch_manifest()
	_check(_um.plan(fetched["manifest"]).is_empty(), "tanpa perubahan, plan kosong")


func _test_resume_partial_download() -> void:
	var before_resumed: int = int(_um.stats["resumed_bytes"])
	var beta2: Dictionary = _make_pack("beta", "2.0.0", "beta v2 " + "padding ".repeat(400))
	var alpha1: Dictionary = _entry_from_disk("alpha")
	var src_path: String = _serve_path(beta2)
	var bytes: PackedByteArray = FileAccess.get_file_as_bytes(src_path)
	var half: int = bytes.size() / 2
	var part_path: String = _part_path(beta2)
	DirAccess.make_dir_recursive_absolute(part_path.get_base_dir())
	var f: FileAccess = FileAccess.open(part_path, FileAccess.WRITE)
	f.store_buffer(bytes.slice(0, half))
	f.close()

	_write_manifest([alpha1, beta2])
	var fetched: Dictionary = await _um.fetch_manifest()
	var plan: Array = _um.plan(fetched["manifest"])
	var result: Dictionary = await _um.install(plan)
	_check(result["ok"], "resume: install setelah unduhan terputus berhasil: " + str(result["error"]))
	_check(int(_um.stats["resumed_bytes"]) - before_resumed == half,
		"resume: melanjutkan dari %d byte (bukan dari nol)" % half)
	_check(FileAccess.get_file_as_string("res://test_marker_beta.txt").begins_with("beta v2"),  # lint:ignore res_path
		"resume: isi beta v2 benar")
	_check(not FileAccess.file_exists(part_path), "resume: file .part dibersihkan setelah sukses")
	_check(not FileAccess.file_exists(_final_user_path("beta", "1.0.0")), "resume: versi lama beta dihapus setelah versi baru termuat")


func _test_corrupt_hash_rejected() -> void:
	var gamma: Dictionary = _make_pack("gamma", "1.0.0", "gamma")
	var bad: Dictionary = gamma.duplicate()
	bad["sha256"] = "0".repeat(64)
	_write_manifest([bad])
	var fetched: Dictionary = await _um.fetch_manifest()
	var plan: Array = _um.plan(fetched["manifest"])
	var result: Dictionary = await _um.install(plan)
	_check(not result["ok"], "hash tidak cocok ditolak")
	_check(not _um.has_installed("gamma"), "paket rusak tidak tercatat terpasang")
	_check(not FileAccess.file_exists(_part_path(bad)), "file .part paket rusak dihapus")


func _test_offline_restart_loads_installed() -> void:
	var um2 = UpdateManagerScript.new()
	root.add_child(um2)
	var loaded: int = um2.load_installed_packs()
	_check(loaded >= 2, "restart offline memuat paket terpasang (alpha, beta): %d" % loaded)
	um2.queue_free()


func _test_missing_manifest_fails() -> void:
	var saved: String = _um.manifest_url
	_um.manifest_url = BASE_URL + "/tidak-ada.json"
	var fetched: Dictionary = await _um.fetch_manifest()
	_check(not fetched["ok"], "manifest tidak ada menghasilkan error")
	_um.manifest_url = saved


# ---------- helpers ----------

func _check(condition: bool, message: String) -> void:
	if condition:
		_passed += 1
		print("ok   " + message)
	else:
		_failures.append(message)
		print("FAIL " + message)


func _entry(pack_name: String, version: String, content: String) -> Dictionary:
	return {
		"name": pack_name,
		"version": version,
		"url": BASE_URL + "/packs/%s-%s.pck" % [pack_name, version],
		"sha256": content.sha256_text(),
		"size": 1,
	}


func _make_pack(pack_name: String, version: String, marker_text: String) -> Dictionary:
	var src: String = "%s/src/%s.txt" % [_serve_dir, pack_name]
	var f: FileAccess = FileAccess.open(src, FileAccess.WRITE)
	f.store_string(marker_text)
	f.close()
	var out: String = _serve_path_for(pack_name, version)
	var packer: PCKPacker = PCKPacker.new()
	var err: Error = packer.pck_start(out)
	if err != OK:
		push_error("pck_start gagal: %d" % err)
	packer.add_file("res://test_marker_%s.txt" % pack_name, src)
	packer.flush()
	var size: int = FileAccess.get_file_as_bytes(out).size()
	return {
		"name": pack_name,
		"version": version,
		"url": BASE_URL + "/packs/%s-%s.pck" % [pack_name, version],
		"sha256": FileAccess.get_sha256(out),
		"size": size,
	}


func _entry_from_disk(pack_name: String) -> Dictionary:
	# Ambil entri alpha yang sudah dibuat di tes pertama dari manifest terakhir.
	var manifest: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(_serve_dir + "/manifest.json"))
	for entry: Variant in manifest["packs"]:
		if entry["name"] == pack_name:
			return entry
	return {}


func _write_manifest(packs: Array) -> void:
	var f: FileAccess = FileAccess.open(_serve_dir + "/manifest.json", FileAccess.WRITE)
	f.store_string(JSON.stringify({"manifest_version": 1, "packs": packs}))
	f.close()


func _serve_path_for(pack_name: String, version: String) -> String:
	return "%s/packs/%s-%s.pck" % [_serve_dir, pack_name, version]


func _serve_path(entry: Dictionary) -> String:
	return _serve_path_for(entry["name"], entry["version"])


func _part_path(entry: Dictionary) -> String:
	return _um._final_path(entry) + ".part"


func _final_user_path(pack_name: String, version: String) -> String:
	# Versi lama dicari dari installed.json sebelum diganti (sha dari server tes).
	var src: String = _serve_path_for(pack_name, version)
	var sha: String = FileAccess.get_sha256(src)
	return "%s/%s-%s.pck" % [UpdateManagerScript.CONTENT_DIR, pack_name, sha.substr(0, 12)]


func _reset_user_content() -> void:
	var dir: DirAccess = DirAccess.open(UpdateManagerScript.CONTENT_DIR)
	if dir == null:
		return
	for file_name: String in dir.get_files():
		dir.remove(file_name)

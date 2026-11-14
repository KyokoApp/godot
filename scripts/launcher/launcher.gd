extends Control
## Launcher (scene pertama). Splash -> cek update konten -> unduh bila perlu -> masuk World.

const WORLD_SCENE: String = "res://scenes/World.tscn"
const WORLD_PACK_NAME: String = "world"
const SPLASH_SECONDS: float = 1.5
const TIP_SECONDS: float = 4.0
const CONFIRM_THRESHOLD_BYTES: int = 50 * 1024 * 1024
const MIN_FREE_MARGIN_BYTES: int = 50 * 1024 * 1024
const TIPS: Array[String] = [
	"Tip: satu jari geser untuk melihat sekeliling.",
	"Tip: dua jari cubit untuk maju dan mundur.",
	"Tip: update berikutnya hanya mengunduh bagian yang berubah.",
	"Tip: sambungkan Wi-Fi sebelum mengunduh update besar.",
]

@onready var _title: Label = $Title
@onready var _tip: Label = $Tip
@onready var _status: Label = $Status
@onready var _bar: ProgressBar = $ProgressBar
@onready var _retry_button: Button = $RetryButton
@onready var _offline_button: Button = $OfflineButton
@onready var _confirm: ConfirmationDialog = $ConfirmDialog

var _tip_index: int = 0
var _pending_plan: Array = []


func _ready() -> void:
	_title.text = "vel magic"
	_tip.text = TIPS[0]
	_retry_button.pressed.connect(_on_retry_pressed)
	_offline_button.pressed.connect(_enter_world)
	_confirm.confirmed.connect(_on_confirm_download)
	_confirm.canceled.connect(_on_confirm_canceled)
	UpdateManager.progress_changed.connect(_on_progress)

	var tip_timer: Timer = Timer.new()
	tip_timer.wait_time = TIP_SECONDS
	tip_timer.timeout.connect(_next_tip)
	add_child(tip_timer)
	tip_timer.start()

	_retry_button.hide()
	_offline_button.hide()
	_run()


func _run() -> void:
	_retry_button.hide()
	_offline_button.hide()
	_bar.value = 0
	_set_status("Memulai...")
	await get_tree().create_timer(SPLASH_SECONDS).timeout

	# Di editor, konten sudah ada di res:// jadi update dilewati.
	if OS.has_feature("editor"):
		_enter_world()
		return

	UpdateManager.load_installed_packs()
	_set_status("Mengecek update...")
	var fetched: Dictionary = await UpdateManager.fetch_manifest()
	if not fetched["ok"]:
		if UpdateManager.has_installed(WORLD_PACK_NAME):
			_set_status("Tidak bisa cek update. Lanjut dengan konten terakhir.")
			await get_tree().create_timer(1.5).timeout
			_enter_world()
		else:
			_show_error("Tidak bisa mengunduh konten pertama.\n" + str(fetched["error"]))
		return

	var plan: Array = UpdateManager.plan(fetched["manifest"])
	if plan.is_empty():
		_enter_world()
		return

	var total: int = UpdateLogic.total_bytes(plan)
	var free: int = UpdateManager.free_space_bytes()
	var needed: int = int(total * 1.5) + MIN_FREE_MARGIN_BYTES
	if free >= 0 and free < needed:
		_show_error("Ruang penyimpanan kurang. Butuh sekitar %s, tersedia %s." % [
			UpdateLogic.format_mb(needed), UpdateLogic.format_mb(free)])
		return

	if total > CONFIRM_THRESHOLD_BYTES:
		_pending_plan = plan
		_confirm.dialog_text = "Ada update konten sebesar %s. Disarankan memakai Wi-Fi. Unduh sekarang?" % UpdateLogic.format_mb(total)
		_confirm.popup_centered()
		return

	await _start_install(plan)


func _on_confirm_download() -> void:
	await _start_install(_pending_plan)


func _on_confirm_canceled() -> void:
	if UpdateManager.has_installed(WORLD_PACK_NAME):
		_enter_world()
	else:
		_show_error("Update dibatalkan. Konten belum terpasang.")


func _start_install(plan: Array) -> void:
	_set_status("Mengunduh update...")
	var result: Dictionary = await UpdateManager.install(plan)
	if result["ok"]:
		_enter_world()
	else:
		_show_error("Update gagal: " + str(result["error"]))


func _on_progress(fraction: float, text: String) -> void:
	_bar.value = fraction * 100.0
	_set_status(text)


func _show_error(message: String) -> void:
	_set_status(message)
	_retry_button.show()
	_offline_button.visible = UpdateManager.has_installed(WORLD_PACK_NAME)


func _on_retry_pressed() -> void:
	await _run()


func _enter_world() -> void:
	var err: Error = get_tree().change_scene_to_file(WORLD_SCENE)
	if err != OK:
		_show_error("Gagal membuka dunia (error %d)." % err)


func _set_status(text: String) -> void:
	_status.text = text


func _next_tip() -> void:
	_tip_index = (_tip_index + 1) % TIPS.size()
	_tip.text = TIPS[_tip_index]

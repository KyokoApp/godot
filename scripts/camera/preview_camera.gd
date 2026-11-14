extends Camera3D
## Kamera preview sementara (Fase 0). BUKAN kamera gameplay.
## Tujuan: melihat dunia dari ketinggian mata (sekitar 1.7 m) untuk
## mengecek terrain, rumput, jalan, dan lighting.
##
## PC:
##   - Tahan klik kanan + geser mouse : melihat sekeliling
##   - W A S D                        : bergerak (datar, seperti berjalan)
##   - Q / E                          : turun / naik
##   - Shift                          : lebih cepat
##   - Scroll mouse                   : ubah kecepatan dasar
##
## HP (sentuh):
##   - Satu jari geser                : melihat sekeliling
##   - Dua jari geser                 : geser posisi (pan)
##   - Dua jari cubit (pinch)         : maju / mundur

@export var move_speed: float = 6.0
@export var fast_multiplier: float = 3.0
@export var min_move_speed: float = 1.0
@export var max_move_speed: float = 40.0
@export var mouse_look_sensitivity: float = 0.003
@export var touch_look_sensitivity: float = 0.004
@export var touch_pan_factor: float = 0.01
@export var touch_pinch_factor: float = 0.05

const PITCH_LIMIT: float = PI * 0.5 - 0.05

var _yaw: float = 0.0
var _pitch: float = 0.0
var _mouse_looking: bool = false
var _touch_points: Dictionary = {}
var _last_pinch_distance: float = -1.0
var _last_pan_center: Vector2 = Vector2.ZERO


func _ready() -> void:
	_yaw = rotation.y
	_pitch = rotation.x


func _process(delta: float) -> void:
	var move_input: Vector2 = Vector2.ZERO
	if Input.is_key_pressed(KEY_W):
		move_input.y -= 1.0
	if Input.is_key_pressed(KEY_S):
		move_input.y += 1.0
	if Input.is_key_pressed(KEY_A):
		move_input.x -= 1.0
	if Input.is_key_pressed(KEY_D):
		move_input.x += 1.0

	var vertical: float = 0.0
	if Input.is_key_pressed(KEY_E):
		vertical += 1.0
	if Input.is_key_pressed(KEY_Q):
		vertical -= 1.0

	if move_input == Vector2.ZERO and is_zero_approx(vertical):
		return

	var speed: float = move_speed
	if Input.is_key_pressed(KEY_SHIFT):
		speed *= fast_multiplier

	# Gerak datar mengikuti arah pandang (tanpa ikut turun/naik saat melihat ke atas/bawah).
	var forward: Vector3 = Vector3(-basis.z.x, 0.0, -basis.z.z)
	if forward.length_squared() > 0.0001:
		forward = forward.normalized()
	var right: Vector3 = Vector3(basis.x.x, 0.0, basis.x.z)
	if right.length_squared() > 0.0001:
		right = right.normalized()

	var direction: Vector3 = forward * -move_input.y + right * move_input.x
	direction += Vector3.UP * vertical
	if direction.length_squared() > 1.0:
		direction = direction.normalized()

	global_position += direction * speed * delta


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		_handle_mouse_button(event as InputEventMouseButton)
	elif event is InputEventMouseMotion and _mouse_looking:
		var motion: InputEventMouseMotion = event as InputEventMouseMotion
		_apply_look(motion.relative, mouse_look_sensitivity)
	elif event is InputEventScreenTouch:
		_handle_touch(event as InputEventScreenTouch)
	elif event is InputEventScreenDrag:
		_handle_drag(event as InputEventScreenDrag)


func _handle_mouse_button(event: InputEventMouseButton) -> void:
	match event.button_index:
		MOUSE_BUTTON_RIGHT:
			_mouse_looking = event.pressed
		MOUSE_BUTTON_WHEEL_UP:
			if event.pressed:
				move_speed = clampf(move_speed * 1.15, min_move_speed, max_move_speed)
		MOUSE_BUTTON_WHEEL_DOWN:
			if event.pressed:
				move_speed = clampf(move_speed / 1.15, min_move_speed, max_move_speed)


func _handle_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		_touch_points[event.index] = event.position
	else:
		_touch_points.erase(event.index)
	_reset_multitouch_tracking()


func _handle_drag(event: InputEventScreenDrag) -> void:
	if not _touch_points.has(event.index):
		return
	_touch_points[event.index] = event.position

	if _touch_points.size() == 1:
		_apply_look(event.relative, touch_look_sensitivity)
	elif _touch_points.size() == 2:
		_apply_two_finger_gesture()


func _apply_two_finger_gesture() -> void:
	var points: Array = _touch_points.values()
	var first: Vector2 = points[0]
	var second: Vector2 = points[1]
	var distance: float = first.distance_to(second)
	var center: Vector2 = (first + second) * 0.5

	if _last_pinch_distance < 0.0:
		_last_pinch_distance = distance
		_last_pan_center = center
		return

	# Cubit: jarak berubah -> maju / mundur.
	var pinch_delta: float = distance - _last_pinch_distance
	var forward: Vector3 = Vector3(-basis.z.x, 0.0, -basis.z.z)
	if forward.length_squared() > 0.0001:
		global_position += forward.normalized() * pinch_delta * touch_pinch_factor

	# Geser dua jari: pan kiri-kanan dan maju-mundur datar.
	var pan: Vector2 = center - _last_pan_center
	var right: Vector3 = Vector3(basis.x.x, 0.0, basis.x.z)
	if right.length_squared() > 0.0001:
		global_position -= right.normalized() * pan.x * touch_pan_factor
	# Seperti peta: jari digeser ke atas -> pandangan maju.
	if forward.length_squared() > 0.0001:
		global_position -= forward.normalized() * pan.y * touch_pan_factor

	_last_pinch_distance = distance
	_last_pan_center = center


func _reset_multitouch_tracking() -> void:
	_last_pinch_distance = -1.0
	_last_pan_center = Vector2.ZERO


func _apply_look(relative: Vector2, sensitivity: float) -> void:
	_yaw -= relative.x * sensitivity
	_pitch = clampf(_pitch - relative.y * sensitivity, -PITCH_LIMIT, PITCH_LIMIT)
	rotation = Vector3(_pitch, _yaw, 0.0)

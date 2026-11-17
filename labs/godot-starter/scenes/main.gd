extends Node2D
## Layar awal Godot: sama seperti versi Phaser, ambil papan skor dari backend.
## Jalankan dengan server Node hidup (npm start di folder server).

const API := "/api"

@onready var label: Label = $UI/Label
@onready var http: HTTPRequest = $HTTP

func _ready() -> void:
	http.request_completed.connect(_on_scores)
	label.text = "Sky Runner (Godot) — memuat papan skor…"
	http.request("%s/scores?limit=5" % API)

func _on_scores(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if code != 200:
		label.text = "Server tidak tersedia (kode %d)" % code
		return
	var data: Variant = JSON.parse_string(body.get_string_from_utf8())
	var lines := PackedStringArray(["Sky Runner — papan skor"])
	if data is Dictionary and data.has("scores"):
		for row in data["scores"]:
			lines.append("%s — %s" % [row.get("name", "?"), str(row.get("score", 0))])
	label.text = "\n".join(lines)

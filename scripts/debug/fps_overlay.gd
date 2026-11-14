extends Label
## Overlay FPS sederhana untuk mencatat performa langsung di HP.
## Menampilkan FPS, jumlah draw call, dan renderer yang benar-benar aktif.


func _process(_delta: float) -> void:
	var fps: int = Engine.get_frames_per_second()
	var draw_calls: int = int(RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME))
	var renderer: String = RenderingServer.get_current_rendering_method()
	text = "FPS %d | draw calls %d | %s" % [fps, draw_calls, renderer]

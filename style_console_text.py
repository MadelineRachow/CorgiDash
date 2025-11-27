def style_text(text, style, color):
    # Convert hex to RGB
    hex_color = color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    if style.lower() == "bold":
        style_code = "\033[1m"
    else:
        style_code = ""

    color_code = f"\033[38;2;{r};{g};{b}m"
    reset = "\033[0m"

    return f"{style_code}{color_code}{text}{reset}"
import sys
from pathlib import Path
from src import config

def load_convert_prompt(slug: str, prompt_file: str | Path = "convert.txt") -> str:
    """Carrega o prompt de conversão (padrão: prompts/convert.txt) e substitui o placeholder {slug}."""
    file_path = Path(prompt_file)
    if not file_path.exists():
        file_path = config.PROMPTS_DIR / prompt_file
    if not file_path.exists():
        file_path = config.ROOT_DIR / prompt_file
    if not file_path.exists():
        file_path = config.PROMPTS_DIR / "convert.txt"

    if not file_path.exists():
        print(f"❌ Erro: Prompt de conversão não encontrado: {file_path}")
        sys.exit(1)

    prompt = file_path.read_text(encoding="utf-8")
    prompt = prompt.replace("{slug}", slug)
    return prompt

# Alias para compatibilidade
ORIGINAIS_DIR = load_convert_prompt

def render_pdf_pages(pdf_path: Path, output_dir: Path, scale: float = 2.0) -> list[Path]:
    """Renderiza cada página do PDF como imagem PNG de alta resolução."""
    try:
        import pymupdf
    except ImportError:
        print("❌ Erro: pymupdf não está instalado.")
        print("   Instale com: pip install pymupdf")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(str(pdf_path))
    image_paths = []

    print(f"   📄 Renderizando {len(doc)} páginas do PDF em {scale}x ({int(72*scale)} DPI)...")
    for i, page in enumerate(doc):
        mat = pymupdf.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat)
        img_path = output_dir / f"page-{i+1}.png"
        pix.save(str(img_path))
        image_paths.append(img_path)
        print(f"      ✓ Página {i+1}/{len(doc)} → {img_path.name} ({pix.width}x{pix.height})")

    doc.close()
    return image_paths

def call_gemini_multimodal(api_key: str, prompt: str, image_paths: list[Path], model: str = "gemini-2.5-flash") -> str:
    """Envia as imagens e o prompt para o Gemini e retorna o texto gerado."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("❌ Erro: google-genai não está instalado.")
        print("   Instale com: pip install google-genai")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    # Montar conteúdo multimodal: imagens + prompt de texto
    contents = []
    for img_path in image_paths:
        img_bytes = img_path.read_bytes()
        contents.append(
            types.Part.from_bytes(
                data=img_bytes,
                mime_type="image/png",
            )
        )

    contents.append(types.Part.from_text(text=prompt))

    print(f"   🤖 Enviando {len(image_paths)} imagens para {model}...")
    print(f"      (isso pode levar 1-3 minutos dependendo do tamanho do PDF)")

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=16384,
        ),
    )

    return response.text

def load_example_slide() -> str:
    """Carrega um slide existente como exemplo de referência para o prompt."""
    example_file = config.CONTENTS_DIR / "aula-2.qmd"
    if example_file.exists():
        content = example_file.read_text(encoding="utf-8")
        # Remove o cabeçalho YAML
        parts = content.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    return ""

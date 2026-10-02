import sys
import shutil
import os
import re
from src import config

def normalize_lesson_slug(name: str) -> str:
    """Normaliza o identificador da aula (ex: '0' -> 'aula-0', 'aula-0.qmd' -> 'aula-0')."""
    clean = name.replace(".qmd", "").strip()
    if clean.isdigit():
        return f"aula-{clean}"
    return clean

def pdf_name_to_slug(pdf_name: str) -> str:
    """Converte nome de PDF para slug (ex: 'Aula-3.pdf' -> 'aula-3')."""
    return pdf_name.replace(".pdf", "").lower()

def format_lesson_title(slug: str, title: str | None = None) -> str:
    """
    Gera o título padronizado da aula (ex: 'Aula 3 - Soma de Produtos' ou 'Aula 6.1 - Display de 7 Segmentos').
    """
    # Determina o número da aula formatado (ex: 'aula-3' -> '3', 'aula-6-1' -> '6.1')
    clean_num = slug.lower().replace("aula-", "").replace("aula_", "")
    aula_num = clean_num.replace("-", ".")
    prefix = f"Aula {aula_num}"

    # Se nenhum título foi fornecido, consulta config.AULA_TITLES
    if not title:
        aula_titles = getattr(config, "AULA_TITLES", {})
        title = aula_titles.get(slug) or aula_titles.get(slug.lower())

    if not title:
        return prefix

    title = title.strip()

    # Se já estiver formatado corretamente como "Aula X - Título"
    pattern_correct = rf"^aula\s+{re.escape(aula_num)}\s*[-–—]\s*(.+)$"
    m = re.match(pattern_correct, title, flags=re.IGNORECASE)
    if m:
        return f"{prefix} - {m.group(1).strip()}"

    # Se estiver com hífen no número (ex: "Aula 6-1 - Título"), ajusta para ponto "Aula 6.1 - Título"
    pattern_hyphen = rf"^aula\s+{re.escape(clean_num)}\s*[-–—]\s*(.+)$"
    m_hyphen = re.match(pattern_hyphen, title, flags=re.IGNORECASE)
    if m_hyphen:
        return f"{prefix} - {m_hyphen.group(1).strip()}"

    # Se o título for apenas o prefixo ("Aula 3" ou "Aula 6.1" ou "Aula 6-1")
    if title.lower() in (prefix.lower(), f"aula {clean_num}".lower()):
        return prefix

    # Se começar com "Aula - " ou "Aula: "
    pattern_generic = r"^aula\s*[-–—:]\s*(.+)$"
    m_gen = re.match(pattern_generic, title, flags=re.IGNORECASE)
    if m_gen:
        cleaned = m_gen.group(1).strip()
        cleaned = re.sub(rf"^aula\s*{re.escape(clean_num)}\s*", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(rf"^aula\s*{re.escape(aula_num)}\s*", "", cleaned, flags=re.IGNORECASE).strip()
        if cleaned:
            return f"{prefix} - {cleaned}"
        return prefix

    return f"{prefix} - {title}"

def extract_title_from_content(content: str) -> str | None:
    """Tenta extrair o título do primeiro cabeçalho de seção (# ou ##) do conteúdo gerado."""
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("# ") and not line.startswith("## "):
            heading = line.lstrip("#").strip()
            heading = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", heading)
            heading = heading.replace("**", "").replace("*", "").strip()
            if heading:
                return heading
    return None

def check_quarto():
    """Verifica se o binário do Quarto está instalado e disponível no PATH."""
    if not shutil.which("quarto"):
        print("❌ Erro: O executável 'quarto' não foi encontrado no seu PATH.")
        print("   O script precisa do Quarto CLI instalado no sistema para renderizar os slides.")
        print("   👉 Como instalar:")
        print("      - Baixe o pacote em: https://quarto.org/docs/get-started/")
        print("      - Ou no Linux: baixe o .tar.gz das releases do GitHub e extraia para ~/.local/bin\n")
        sys.exit(1)

def load_api_key() -> str:
    """Carrega a chave de API do Gemini a partir do arquivo .env."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        print("❌ Erro: python-dotenv não está instalado.")
        print("   Instale com: pip install python-dotenv")
        sys.exit(1)

    env_path = config.ROOT_DIR / ".env"
    if not env_path.exists():
        print("❌ Erro: Arquivo .env não encontrado na raiz do projeto.")
        print("   Crie o arquivo .env com a variável GEMINI_API_KEY:")
        print("   echo 'GEMINI_API_KEY=sua-chave-aqui' > .env")
        sys.exit(1)

    load_dotenv(env_path)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("❌ Erro: GEMINI_API_KEY não definida ou vazia no arquivo .env")
        print("   Obtenha sua chave em: https://aistudio.google.com/apikey")
        sys.exit(1)

    return api_key

def clean_model_output(text: str) -> str:
    """Remove possíveis wrappers de código que o modelo pode adicionar."""
    # Remove blocos ```markdown ... ``` ou ```qmd ... ```
    text = re.sub(r'^```(?:markdown|qmd|md)?\s*\n', '', text)
    text = re.sub(r'\n```\s*$', '', text)
    return text.strip()

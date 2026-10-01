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

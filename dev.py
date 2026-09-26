#!/usr/bin/env python3
"""
Script de desenvolvimento para o projeto slides-bruno.
Facilita criar novas aulas, visualizar slides com live-reload e compilar o projeto.

Uso:
  python dev.py preview [aula]       # Inicia live-reload (ex: python dev.py preview 0)
  python dev.py new <nome> [titulo]   # Cria nova aula em contents/ e pasta em assets/
  python dev.py build                 # Compila todo o projeto para output/
  python dev.py clean                 # Limpa saídas locais e caches temporários
"""

import sys
import shutil
import subprocess
import argparse
from pathlib import Path

# ==============================================================================
# CONFIGURAÇÕES E DIRETÓRIOS
# ==============================================================================
ROOT_DIR = Path(__file__).parent.resolve()
CONTENTS_DIR = ROOT_DIR / "contents"
ASSETS_DIR = ROOT_DIR / "assets"
OUTPUT_DIR = ROOT_DIR / "output"

DEFAULT_AUTHOR = "Dr. Bruno Pereira Santos <br> Caio Sereno Santos Rebouças"
DEFAULT_SUBTITLE = "MATA38 - Projeto de Circuitos Lógicos"

# ==============================================================================
# TEMPLATES
# ==============================================================================
SLIDE_TEMPLATE = """---
title: "{title}"
subtitle: "{subtitle}"
author: "{author}"
format: 
  revealjs:
    transition: fade
    slide-number: true
    incremental: true
    theme: [default, ../assets/global/theme.scss]
    navigation-mode: linear
    controls-layout: bottom-right
    include-after-body: ../assets/global/breadcrumb.html
---

"""


# ==============================================================================
# UTILITÁRIOS
# ==============================================================================
def normalize_lesson_slug(name: str) -> str:
    """Normaliza o identificador da aula (ex: '0' -> 'aula-0', 'aula-0.qmd' -> 'aula-0')."""
    clean = name.replace(".qmd", "").strip()
    if clean.isdigit():
        return f"aula-{clean}"
    return clean


def check_quarto():
    """Verifica se o binário do Quarto está instalado e disponível no PATH."""
    if not shutil.which("quarto"):
        print("❌ Erro: O executável 'quarto' não foi encontrado no seu PATH.")
        print("   O script precisa do Quarto CLI instalado no sistema para renderizar os slides.")
        print("   👉 Como instalar:")
        print("      - Baixe o pacote em: https://quarto.org/docs/get-started/")
        print("      - Ou no Linux: baixe o .tar.gz das releases do GitHub e extraia para ~/.local/bin\n")
        sys.exit(1)


# ==============================================================================
# COMANDOS
# ==============================================================================
def cmd_preview(target: str = None):
    """Inicia o Quarto preview com live-reload."""
    check_quarto()
    if not target:
        print("🚀 Iniciando Quarto Preview do site completo (index + todas as aulas)...")
        subprocess.run(["quarto", "preview"], cwd=ROOT_DIR)
        return

    slug = normalize_lesson_slug(target)
    qmd_file = CONTENTS_DIR / f"{slug}.qmd"

    if not qmd_file.exists():
        direct_path = Path(target)
        if direct_path.exists():
            qmd_file = direct_path
        else:
            available = [f.stem for f in CONTENTS_DIR.glob("*.qmd")]
            print(f"❌ Arquivo não encontrado: {qmd_file}")
            print(f"   Aulas disponíveis em contents/: {available}")
            sys.exit(1)

    print(f"🚀 Iniciando Quarto Preview para: {qmd_file.name}")
    print(f"   Alterações em {qmd_file.name} ou assets/ atualizarão automaticamente no navegador.\n")
    subprocess.run(["quarto", "preview", str(qmd_file)], cwd=ROOT_DIR)


def cmd_new(name: str, title: str = None, subtitle: str = None, author: str = None):
    """Cria uma nova aula e sua respectiva pasta de assets a partir do template."""
    slug = normalize_lesson_slug(name)
    qmd_file = CONTENTS_DIR / f"{slug}.qmd"
    aula_assets = ASSETS_DIR / slug

    if qmd_file.exists():
        print(f"⚠️  Atenção: O arquivo {qmd_file.relative_to(ROOT_DIR)} já existe.")
        choice = input("Deseja sobrescrever? (s/N): ").strip().lower()
        if choice != "s":
            print("Operação cancelada.")
            return

    # Garante que os diretórios existem
    aula_assets.mkdir(parents=True, exist_ok=True)
    CONTENTS_DIR.mkdir(parents=True, exist_ok=True)

    final_title = title if title else f"Aula - {slug.replace('-', ' ').title()}"
    final_subtitle = subtitle if subtitle else DEFAULT_SUBTITLE
    final_author = author if author else DEFAULT_AUTHOR

    # Renderiza o template do slide
    content = SLIDE_TEMPLATE.format(
        title=final_title,
        subtitle=final_subtitle,
        author=final_author,
        slug=slug,
    )

    qmd_file.write_text(content, encoding="utf-8")

    print(f"✅ Criado com sucesso:")
    print(f"   📄 Slide:  {qmd_file.relative_to(ROOT_DIR)}")
    print(f"   📂 Assets: {aula_assets.relative_to(ROOT_DIR)}/")
    print(f"\n💡 Para editar e visualizar em tempo real:")
    print(f"   python dev.py preview {slug}")


def cmd_build():
    """Compila o projeto completo para output/."""
    check_quarto()
    print("🔨 Compilando projeto completo com Quarto...")
    res = subprocess.run(["quarto", "render"], cwd=ROOT_DIR)
    if res.returncode == 0:
        print(f"\n✨ Build finalizado com sucesso em: {OUTPUT_DIR.relative_to(ROOT_DIR)}/")
    else:
        print("\n❌ Erro durante a compilação.")
        sys.exit(res.returncode)


def cmd_clean():
    """Remove pastas de build e arquivos temporários."""
    targets = [
        ROOT_DIR / ".quarto",
        CONTENTS_DIR / ".quarto",
        OUTPUT_DIR,
    ]
    targets.extend(ROOT_DIR.glob("*_files"))
    targets.extend(CONTENTS_DIR.glob("*_files"))
    targets.extend(CONTENTS_DIR.glob("*.html"))

    count = 0
    for path in targets:
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
            count += 1
        elif path.is_file():
            path.unlink(missing_ok=True)
            count += 1

    print(f"🧹 Limpeza concluída ({count} itens removidos).")


# ==============================================================================
# CLI PARSER
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Helper de desenvolvimento para slides Quarto.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python dev.py preview               # Preview do site completo
  python dev.py preview aula-0        # Preview específico da aula 0
  python dev.py preview 0             # Atalho para preview da aula 0
  python dev.py new aula-1 "Álgebra Booleana"
  python dev.py build                 # Renderiza para output/
  python dev.py clean                 # Limpa arquivos temporários
""",
    )

    subparsers = parser.add_subparsers(dest="command", help="Comando a executar")

    # preview
    p_preview = subparsers.add_parser("preview", help="Inicia o servidor com live-reload")
    p_preview.add_argument("target", nargs="?", default=None, help="Aula ou arquivo específico (ex: 0, aula-0 ou contents/aula-0.qmd)")

    # new (com alias 'create')
    p_new = subparsers.add_parser("new", aliases=["create"], help="Cria uma nova aula em contents/ e sua pasta em assets/")
    p_new.add_argument("name", help="Identificador da aula (ex: aula-1 ou 1)")
    p_new.add_argument("title", nargs="?", default=None, help="Título do slide")
    p_new.add_argument("--subtitle", default=None, help="Subtítulo do slide")
    p_new.add_argument("--author", default=None, help="Autor do slide")

    # build
    subparsers.add_parser("build", help="Renderiza todo o projeto para output/")

    # clean
    subparsers.add_parser("clean", help="Limpa diretórios de build e temporários")

    args = parser.parse_args()

    if args.command in ("new", "create"):
        cmd_new(args.name, args.title, args.subtitle, getattr(args, "author", None))
    elif args.command == "preview":
        cmd_preview(args.target)
    elif args.command == "build":
        cmd_build()
    elif args.command == "clean":
        cmd_clean()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Script de desenvolvimento para o projeto slides-bruno.
Facilita criar novas aulas, visualizar slides com live-reload e compilar o projeto.

Uso:
  python dev.py preview [aula]       # Inicia live-reload (ex: python dev.py preview 0)
  python dev.py new <nome> [titulo]   # Cria nova aula em contents/ e pasta em assets/
  python dev.py build                 # Compila todo o projeto para output/
  python dev.py clean                 # Limpa saídas locais e caches temporários
  python dev.py convert <pdf>         # Converte PDF do Notability em slide .qmd via Gemini
  python dev.py convert-all           # Converte todos os PDFs em originais/
"""

import argparse
from src import commands

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
  python dev.py convert Aula-3.pdf    # Converte um PDF via Gemini
  python dev.py convert-all           # Converte todos os PDFs pendentes
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

    # convert
    p_convert = subparsers.add_parser("convert", help="Converte um PDF do Notability em slide .qmd via Gemini")
    p_convert.add_argument("pdf", help="Caminho do PDF (ex: Aula-3.pdf, originais/Aula-3.pdf)")
    p_convert.add_argument("prompt_file", nargs="?", default="convert.txt", help="Arquivo de prompt a usar (default: convert.txt)")
    p_convert.add_argument("--force", "-f", action="store_true", help="Sobrescrever .qmd existente sem perguntar")
    p_convert.add_argument("--model", "-m", default="gemini-2.5-flash", help="Modelo Gemini a usar (default: gemini-2.5-flash)")
    p_convert.add_argument("--title", "-t", default=None, help="Título personalizado da aula")
    p_convert.add_argument("--prompt", "-p", default=None, help="Arquivo de prompt alternativo")

    # convert-all
    p_convert_all = subparsers.add_parser("convert-all", help="Converte todos os PDFs em originais/")
    p_convert_all.add_argument("--force", "-f", action="store_true", help="Reconverter mesmo se .qmd já existir")
    p_convert_all.add_argument("--model", "-m", default="gemini-2.5-flash", help="Modelo Gemini a usar (default: gemini-2.5-flash)")
    p_convert_all.add_argument("--prompt", "-p", default="convert.txt", help="Arquivo de prompt a usar (default: convert.txt)")

    # build
    subparsers.add_parser("build", help="Renderiza todo o projeto para output/")

    # clean
    subparsers.add_parser("clean", help="Limpa diretórios de build e temporários")

    args = parser.parse_args()

    if args.command in ("new", "create"):
        commands.cmd_new(args.name, args.title, args.subtitle, getattr(args, "author", None))
    elif args.command == "preview":
        commands.cmd_preview(args.target)
    elif args.command == "convert":
        prompt_file = args.prompt if args.prompt else args.prompt_file
        commands.cmd_convert(
            args.pdf,
            force=args.force,
            model=args.model,
            title=args.title,
            prompt_file=prompt_file,
        )
    elif args.command == "convert-all":
        commands.cmd_convert_all(
            force=args.force,
            model=args.model,
            prompt_file=args.prompt,
        )
    elif args.command == "build":
        commands.cmd_build()
    elif args.command == "clean":
        commands.cmd_clean()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

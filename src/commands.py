import sys
import shutil
import subprocess
from pathlib import Path

from src import config
from src import utils
from src import pdf_converter

def cmd_preview(target: str = None):
    """Inicia o Quarto preview com live-reload."""
    utils.check_quarto()
    if not target:
        print("🚀 Iniciando Quarto Preview do conteúdo em contents/...")
        subprocess.run(["quarto", "preview", str(config.CONTENTS_DIR)], cwd=config.ROOT_DIR)
        return

    slug = utils.normalize_lesson_slug(target)
    qmd_file = config.CONTENTS_DIR / f"{slug}.qmd"

    if not qmd_file.exists():
        direct_path = Path(target)
        if direct_path.exists():
            qmd_file = direct_path
        else:
            available = [f.stem for f in config.CONTENTS_DIR.glob("*.qmd")]
            print(f"❌ Arquivo não encontrado: {qmd_file}")
            print(f"   Aulas disponíveis em contents/: {available}")
            sys.exit(1)

    print(f"🚀 Iniciando Quarto Preview para: {qmd_file.name}")
    print(f"   Alterações em {qmd_file.name} ou assets/ atualizarão automaticamente no navegador.\n")
    subprocess.run(["quarto", "preview", str(qmd_file)], cwd=config.ROOT_DIR)

def cmd_new(name: str, title: str = None, subtitle: str = None, author: str = None):
    """Cria uma nova aula e sua respectiva pasta de assets a partir do template."""
    slug = utils.normalize_lesson_slug(name)
    qmd_file = config.CONTENTS_DIR / f"{slug}.qmd"
    aula_assets = config.ASSETS_DIR / slug

    if qmd_file.exists():
        print(f"⚠️  Atenção: O arquivo {qmd_file.relative_to(config.ROOT_DIR)} já existe.")
        choice = input("Deseja sobrescrever? (s/N): ").strip().lower()
        if choice != "s":
            print("Operação cancelada.")
            return

    # Garante que os diretórios existem
    aula_assets.mkdir(parents=True, exist_ok=True)
    config.CONTENTS_DIR.mkdir(parents=True, exist_ok=True)

    final_title = utils.format_lesson_title(slug, title=title)
    final_subtitle = subtitle if subtitle else config.DEFAULT_SUBTITLE
    final_author = author if author else config.DEFAULT_AUTHOR

    # Renderiza o template do slide
    content = config.SLIDE_TEMPLATE.format(
        title=final_title,
        subtitle=final_subtitle,
        author=final_author,
        slug=slug,
    )

    qmd_file.write_text(content, encoding="utf-8")

    print(f"✅ Criado com sucesso:")
    print(f"   📄 Slide:  {qmd_file.relative_to(config.ROOT_DIR)}")
    print(f"   📂 Assets: {aula_assets.relative_to(config.ROOT_DIR)}/")
    print(f"\n💡 Para editar e visualizar em tempo real:")
    print(f"   python dev.py preview {slug}")

def cmd_convert(
    pdf_path: str,
    force: bool = False,
    model: str = "gemini-2.5-flash",
    title: str = None,
    prompt_file: str = "convert.txt",
):
    """Converte um PDF do Notability em slide .qmd usando modelo multimodal Gemini."""
    
    # Tratamento defensivo caso prompt_file seja passado na posição de force
    if isinstance(force, str):
        prompt_file = force
        force = False

    # Validação caso o usuário passe diretamente o arquivo de prompt em vez do PDF
    if pdf_path.endswith(".txt") or Path(pdf_path).name == "convert.txt":
        print(f"❌ '{pdf_path}' é um arquivo de prompt, não um PDF.")
        print("   Uso: python dev.py convert <arquivo.pdf> [convert.txt]")
        sys.exit(1)

    # Resolver o caminho do PDF
    pdf = Path(pdf_path)
    if not pdf.exists():
        # Tentar em originais/
        pdf = config.ORIGINAIS_DIR / pdf_path
    if not pdf.exists():
        # Tentar adicionando .pdf
        pdf = config.ORIGINAIS_DIR / f"{pdf_path}.pdf"
    if not pdf.exists():
        # Tentar com capitalização
        for f in config.ORIGINAIS_DIR.glob("*.pdf"):
            if f.stem.lower() == Path(pdf_path).stem.lower():
                pdf = f
                break

    if not pdf.exists():
        print(f"❌ Erro: PDF não encontrado: {pdf_path}")
        available = [f.name for f in config.ORIGINAIS_DIR.glob("*.pdf")]
        print(f"   PDFs disponíveis em originais/: {available}")
        sys.exit(1)

    slug = utils.pdf_name_to_slug(pdf.name)
    qmd_file = config.CONTENTS_DIR / f"{slug}.qmd"
    aula_assets = config.ASSETS_DIR / slug

    print(f"🔄 Convertendo: {pdf.name} → {qmd_file.relative_to(config.ROOT_DIR)}")
    print(f"   Slug: {slug}")

    # Verificar se já existe
    if qmd_file.exists() and not force:
        print(f"⚠️  O arquivo {qmd_file.relative_to(config.ROOT_DIR)} já existe.")
        choice = input("   Deseja sobrescrever? (s/N): ").strip().lower()
        if choice != "s":
            print("   Operação cancelada.")
            return

    # 1. Carregar API key
    api_key = utils.load_api_key()
    print("   🔑 API Key carregada com sucesso")

    # 2. Renderizar páginas do PDF como imagens PNG
    sources_dir = aula_assets / "sources"
    image_paths = pdf_converter.render_pdf_pages(pdf, sources_dir)

    # 3. Carregar e montar o prompt a partir de convert.txt ou arquivo customizado
    prompt = pdf_converter.load_convert_prompt(slug, prompt_file=prompt_file)

    # Adicionar exemplo de referência
    example = pdf_converter.load_example_slide()
    if example:
        prompt += f"\n\n## Exemplo de Referência\nAbaixo está um trecho de um slide .qmd existente do mesmo projeto para servir de referência de estilo e formato:\n\n```markdown\n{example[:2000]}\n```\n"

    # 4. Chamar o modelo multimodal
    raw_output = pdf_converter.call_gemini_multimodal(api_key, prompt, image_paths, model=model)
    slide_content = utils.clean_model_output(raw_output)

    # 5. Determinar o título da aula
    final_title = utils.format_lesson_title(slug, title=title)
    clean_num = slug.lower().replace("aula-", "").replace("aula_", "").replace("-", ".")
    if final_title == f"Aula {clean_num}" and not title:
        extracted = utils.extract_title_from_content(slide_content)
        if extracted:
            final_title = utils.format_lesson_title(slug, title=extracted)

    # 6. Montar o arquivo .qmd com cabeçalho YAML
    full_content = config.SLIDE_TEMPLATE.format(
        title=final_title,
        subtitle=config.DEFAULT_SUBTITLE,
        author=config.DEFAULT_AUTHOR,
        slug=slug,
    )
    full_content += slide_content + "\n"

    # 7. Salvar o arquivo
    config.CONTENTS_DIR.mkdir(parents=True, exist_ok=True)
    qmd_file.write_text(full_content, encoding="utf-8")

    print(f"\n✅ Conversão concluída com sucesso!")
    print(f"   📄 Slide:   {qmd_file.relative_to(config.ROOT_DIR)}")
    print(f"   📂 Assets:  {aula_assets.relative_to(config.ROOT_DIR)}/")
    print(f"   🖼️  Páginas: {len(image_paths)} imagens em {sources_dir.relative_to(config.ROOT_DIR)}/")
    print(f"\n💡 Próximos passos:")
    print(f"   1. Revise o conteúdo gerado: {qmd_file.relative_to(config.ROOT_DIR)}")
    print(f"   2. Visualize com: python dev.py preview {slug}")
    print(f"   3. Ajuste manualmente se necessário (fórmulas, diagramas)")

def cmd_convert_all(
    force: bool = False,
    model: str = "gemini-2.5-flash",
    prompt_file: str = "convert.txt",
):
    """Converte todos os PDFs em originais/ que ainda não possuem .qmd correspondente."""
    pdfs = sorted(config.ORIGINAIS_DIR.glob("*.pdf"))
    if not pdfs:
        print("❌ Nenhum PDF encontrado em originais/")
        sys.exit(1)

    print(f"📋 Encontrados {len(pdfs)} PDFs em originais/:\n")

    to_convert = []
    for pdf in pdfs:
        slug = utils.pdf_name_to_slug(pdf.name)
        qmd_file = config.CONTENTS_DIR / f"{slug}.qmd"
        status = "⏭️  já existe" if qmd_file.exists() and not force else "🔄 será convertido"
        print(f"   {pdf.name:20s} → {slug}.qmd  [{status}]")
        if not qmd_file.exists() or force:
            to_convert.append(pdf)

    if not to_convert:
        print("\n✅ Todos os PDFs já foram convertidos. Use --force para reconverter.")
        return

    print(f"\n🚀 Convertendo {len(to_convert)} arquivo(s)...\n")
    print("=" * 60)

    for i, pdf in enumerate(to_convert, 1):
        print(f"\n[{i}/{len(to_convert)}] {pdf.name}")
        print("-" * 40)
        try:
            cmd_convert(str(pdf), force=True, model=model, prompt_file=prompt_file)
        except Exception as e:
            print(f"❌ Erro ao converter {pdf.name}: {e}")
            continue

    print("\n" + "=" * 60)
    print("✅ Conversão em lote concluída!")

def cmd_build():
    """Compila o projeto completo para output/."""
    utils.check_quarto()
    print("🔨 Compilando conteúdo em contents/ com Quarto...")
    res = subprocess.run(["quarto", "render", str(config.CONTENTS_DIR)], cwd=config.ROOT_DIR)
    if res.returncode == 0:
        print(f"\n✨ Build finalizado com sucesso em: {config.OUTPUT_DIR.relative_to(config.ROOT_DIR)}/")
    else:
        print("\n❌ Erro durante a compilação.")
        sys.exit(res.returncode)

def cmd_clean():
    """Remove pastas de build e arquivos temporários."""
    targets = [
        config.ROOT_DIR / ".quarto",
        config.CONTENTS_DIR / ".quarto",
        config.OUTPUT_DIR,
    ]
    targets.extend(config.ROOT_DIR.glob("*_files"))
    targets.extend(config.CONTENTS_DIR.glob("*_files"))
    targets.extend(config.CONTENTS_DIR.glob("*.html"))

    count = 0
    for path in targets:
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
            count += 1
        elif path.is_file():
            path.unlink(missing_ok=True)
            count += 1

    print(f"🧹 Limpeza concluída ({count} itens removidos).")

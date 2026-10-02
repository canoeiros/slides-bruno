from pathlib import Path

# ==============================================================================
# CONFIGURAÇÕES E DIRETÓRIOS
# ==============================================================================
ROOT_DIR = Path(__file__).resolve().parent.parent
CONTENTS_DIR = ROOT_DIR / "contents"
ASSETS_DIR = ROOT_DIR / "assets"
OUTPUT_DIR = ROOT_DIR / "output"
ORIGINAIS_DIR = ROOT_DIR / "originais"
PROMPTS_DIR = ROOT_DIR / "prompts"

DEFAULT_AUTHOR = ["Dr. Bruno Pereira Santos", "Caio Sereno Santos Rebouças"]
DEFAULT_SUBTITLE = "MATA38 - Projeto de Circuitos Lógicos<br><a href='../'>Página Inicial</a>"

# Títulos pré-definidos das aulas
AULA_TITLES = {
    "aula-0": "Introdução",
    "aula-1": "Números Binários",
    "aula-2": "Álgebra Booleana",
    "aula-3": "Soma de Produtos",
    "aula-4": "Portas Lógicas",
    "aula-5": "Portas Lógicas II",
    "aula-6": "Mapa de Karnaugh",
    "aula-6-1": "Display de 7 Segmentos",
}

# ==============================================================================
# TEMPLATES
# ==============================================================================
SLIDE_TEMPLATE = """---
title: "{title}"
subtitle: "{subtitle}"
author: {author}
lang: "pt-BR"
format: 
  revealjs:
    transition: fade
    slide-number: true
    incremental: true
    theme: [default, ../assets/global/theme.scss]
    navigation-mode: linear
    controls-layout: bottom-right
    include-after-body: ../assets/global/breadcrumb.html
    footer: "MATA38 - Projeto de Circuitos Lógicos"
---
"""

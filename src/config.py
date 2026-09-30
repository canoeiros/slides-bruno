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

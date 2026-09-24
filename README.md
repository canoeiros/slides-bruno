# MATA38 - Projeto de Circuitos Lógicos (Slides)

Slides e materiais interativos para a disciplina **MATA38 - Projeto de Circuitos Lógicos / Eletrônica Digital** ministrada pelo Dr. Bruno Pereira Santos.

Publicação automática via GitHub Pages: [canoeiros.github.io/slides-bruno](https://canoeiros.github.io/slides-bruno/)

---

## 📁 Estrutura de Pastas

* `contents/`: Arquivos-fonte dos slides (`aula-0.qmd`, `aula-1.qmd`, etc.).
* `assets/`: Assets (visualizadores HTML, imagens, gráficos interativos) organizados por aula (ex: `assets/aula-0/`).
* `output/`: Saída compilada pelo Quarto (publicada no GitHub Pages via GitHub Actions).
* `index.qmd`: Página inicial com listagem dinâmica automática de todas as aulas.
* `_quarto.yml`: Configuração global do Quarto.

---

## 🛠️ Ferramenta de Desenvolvimento Local (`dev.py`)

Um script local para facilitar o fluxo de criação e visualização de slides:

### 1. Criar uma nova aula com estrutura de pastas
```bash
python dev.py new aula-1 "Álgebra Booleana e Portas Lógicas"
```
> Isso cria automaticamente:
> - `contents/aula-1.qmd` (com tema RevealJS pronto)
> - `assets/aula-1/` (para os gráficos e componentes interativos da aula)

### 2. Visualizar slide em tempo real (Live-reload)
```bash
# Visualizar uma aula específica (atualiza automaticamente ao salvar .qmd ou assets)
python dev.py preview aula-0
# ou pelo número:
python dev.py preview 0

# Visualizar o portal completo (index + todas as aulas)
python dev.py preview
```

### 3. Compilar projeto localmente
```bash
python dev.py build
```

### 4. Limpar arquivos temporários
```bash
python dev.py clean
```

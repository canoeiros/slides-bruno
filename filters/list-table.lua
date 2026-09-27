-- Pandoc Lua Filter to convert ::: {.list-table} into native Pandoc Tables

function Div(div)
  if not div.classes:includes("list-table") then
    return nil
  end

  -- Find the top-level BulletList inside the div
  local bullet_list = nil
  for _, block in ipairs(div.content) do
    if block.t == "BulletList" then
      bullet_list = block
      break
    end
  end

  if not bullet_list then
    return nil
  end

  local rows = {}
  for _, row_item in ipairs(bullet_list.content) do
    local cells = {}
    for _, block in ipairs(row_item) do
      if block.t == "BulletList" then
        for _, cell_item in ipairs(block.content) do
          table.insert(cells, cell_item)
        end
      end
    end
    if #cells > 0 then
      table.insert(rows, cells)
    end
  end

  if #rows == 0 then
    return nil
  end

  -- First row as headers
  local headers = rows[1]
  local body_rows = {}
  for i = 2, #rows do
    table.insert(body_rows, rows[i])
  end

  local num_cols = #headers
  local aligns = {}
  local widths = {}
  for i = 1, num_cols do
    table.insert(aligns, pandoc.AlignCenter)
    table.insert(widths, 0)
  end

  local simple_table = pandoc.SimpleTable(
    {}, -- caption
    aligns,
    widths,
    headers,
    body_rows
  )

  local tbl = pandoc.utils.from_simple_table(simple_table)

  -- Preserve other classes on the div, like 'fragment'
  local new_classes = div.classes:filter(function(c) return c ~= "list-table" end)
  if #new_classes > 0 or div.identifier ~= "" or #div.attributes > 0 then
    div.classes = new_classes
    div.content = pandoc.List({tbl})
    return div
  else
    return tbl
  end
end

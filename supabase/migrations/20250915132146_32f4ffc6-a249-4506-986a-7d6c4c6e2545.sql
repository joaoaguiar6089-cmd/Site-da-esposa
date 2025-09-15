-- Adicionar campo para indicar se o procedimento requer imagem para seleção de área
ALTER TABLE procedures 
ADD COLUMN requires_body_image_selection boolean DEFAULT false;
-- Create storage bucket for procedure images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('procedure-images', 'procedure-images', true);

-- Create policies for procedure images bucket
CREATE POLICY "Anyone can view procedure images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'procedure-images');

CREATE POLICY "Admins can upload procedure images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'procedure-images' AND is_active_admin());

CREATE POLICY "Admins can update procedure images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'procedure-images' AND is_active_admin());

CREATE POLICY "Admins can delete procedure images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'procedure-images' AND is_active_admin());
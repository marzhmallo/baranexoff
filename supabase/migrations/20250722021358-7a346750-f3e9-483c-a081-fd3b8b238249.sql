-- Create storage policies for cashqr bucket to allow file uploads
CREATE POLICY "Allow authenticated users to upload QR codes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cashqr' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update QR codes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cashqr' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow public access to view QR codes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cashqr');

CREATE POLICY "Allow authenticated users to delete QR codes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cashqr' AND auth.uid() IS NOT NULL);
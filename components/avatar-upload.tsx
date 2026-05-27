'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserCircle, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarUploadProps {
  url?: string;
  onUpload: (url: string) => void;
  employeeCode?: string;
}

export function AvatarUpload({ url, onUpload, employeeCode }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Bạn cần chọn 1 ảnh để tải lên.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeCode || 'new'}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      onUpload(data.publicUrl);
      toast.success('Tải ảnh đại diện thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi tải ảnh!');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {url ? (
          <img 
            src={url} 
            alt="Avatar" 
            className="w-20 h-20 rounded-full object-cover border-2 border-teal-100 shadow-sm" 
          />
        ) : (
          <UserCircle className="w-20 h-20 text-slate-300" strokeWidth={1} />
        )}
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-teal-600 shadow-sm transition-colors"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> : <Upload className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-slate-400">Định dạng JPG, PNG</p>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/png, image/jpeg, image/jpg"
        className="hidden"
      />
    </div>
  );
}

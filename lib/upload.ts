'use client'

import { createClient } from '@/lib/supabase/client'
import { squareCropCompress } from '@/lib/image'

/** Upload an image to the public election-media bucket; returns its public URL. */
export async function uploadImage(file: File, folder: string, square = true): Promise<string> {
  const supabase = createClient()
  const blob = square ? await squareCropCompress(file) : file
  const path = `${folder}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('election-media').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('election-media').getPublicUrl(path).data.publicUrl
}

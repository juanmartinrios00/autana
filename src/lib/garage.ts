import { SLOTS } from '../data/garage-slots'
import { compressImage } from './images'
import { requireSupabase, supabase } from './supabase'
import type { GarageEntry, GarageSlot } from '../types'

/* Se reexporta para que las pantallas sigan pidiendo el garage entero a un
   solo modulo: el que dibuja los espacios tambien es el que los guarda. */
export { SLOTS }

/**
 * El garage: los autos que marcaron a alguien, no los que vende.
 *
 * Las fotos las sube el usuario y pasan por la misma compresion que las de las
 * publicaciones, asi que tambien se les borra la ubicacion GPS.
 */


interface GarageRow {
  id: string
  user_id: string
  slot: GarageSlot
  make: string
  model: string
  year: number | null
  photo_path: string | null
  note: string
  created_at: string
}

/** La URL pública de una foto del garage. La usan el garage y las novedades. */
export function garagePhotoUrl(path: string | null): string {
  if (!path || !supabase) return ''
  return supabase.storage.from('garage-photos').getPublicUrl(path).data.publicUrl
}

function toEntry(row: GarageRow): GarageEntry {
  return {
    id: row.id,
    userId: row.user_id,
    slot: row.slot,
    make: row.make,
    model: row.model,
    year: row.year,
    photoUrl: garagePhotoUrl(row.photo_path),
    note: row.note,
    createdAt: row.created_at,
  }
}

export async function listGarage(userId: string): Promise<GarageEntry[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('garage_entries')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error

  const rows = (data as GarageRow[]).map(toEntry)
  /* Se devuelven en el orden de las consignas, no en el de creacion: el
     garage se lee como una linea de tiempo. */
  return SLOTS.map((slot) => rows.find((row) => row.slot === slot.id)).filter(
    (row): row is GarageEntry => row !== undefined,
  )
}

export interface GarageInput {
  slot: GarageSlot
  make: string
  model: string
  year: number | null
  note: string
}

/** Crea o reemplaza el auto de esa consigna. */
export async function saveGarageEntry(
  userId: string,
  input: GarageInput,
  photo?: File,
): Promise<GarageEntry> {
  const client = requireSupabase()

  let photoPath: string | undefined
  if (photo) {
    const compressed = await compressImage(photo)
    const path = `${userId}/${input.slot}.webp`
    const { error } = await client.storage
      .from('garage-photos')
      .upload(path, compressed.blob, { contentType: 'image/webp', upsert: true })

    URL.revokeObjectURL(compressed.previewUrl)
    if (error) throw error
    photoPath = path
  }

  const { data, error } = await client
    .from('garage_entries')
    .upsert(
      {
        user_id: userId,
        slot: input.slot,
        make: input.make,
        model: input.model,
        year: input.year,
        note: input.note,
        ...(photoPath ? { photo_path: photoPath } : {}),
      },
      { onConflict: 'user_id,slot' },
    )
    .select('*')
    .single()

  if (error) throw error
  return toEntry(data as GarageRow)
}

export async function removeGarageEntry(userId: string, slot: GarageSlot): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('garage_entries')
    .delete()
    .eq('user_id', userId)
    .eq('slot', slot)
    .select('photo_path')

  if (error) throw error

  /* Antes la foto quedaba en el bucket, publicada, con la idea de limpiarla
     "después" — y ese después no existía. Una foto de garage puede mostrar una
     patente o la puerta de una casa: quien saca el auto espera que la foto se
     vaya. Se borra después de la fila, así el garage nunca apunta a una foto
     que ya no está. Si falla, la levanta `cleanOrphanPhotos` en la próxima
     sesión. */
  const path = (data as { photo_path: string | null }[] | null)?.[0]?.photo_path
  if (path) {
    await client.storage.from('garage-photos').remove([path]).catch(() => {})
  }
}

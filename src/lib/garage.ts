import { compressImage } from './images'
import { requireSupabase, supabase } from './supabase'
import type { GarageEntry, GarageSlot } from '../types'

/**
 * El garage: los autos que marcaron a alguien, no los que vende.
 *
 * Las fotos las sube el usuario y pasan por la misma compresion que las de las
 * publicaciones, asi que tambien se les borra la ubicacion GPS.
 */

export const SLOTS: { id: GarageSlot; title: string; hint: string }[] = [
  { id: 'first', title: 'Mi primer auto', hint: 'Con el que aprendiste a manejar.' },
  { id: 'current', title: 'El que tengo hoy', hint: 'Tu auto actual.' },
  { id: 'dream', title: 'El auto de mis sueños', hint: 'Ese que algún día.' },
  { id: 'missed', title: 'El que más extraño', hint: 'El que no tendrías que haber vendido.' },
]

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

function photoUrlFor(path: string | null): string {
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
    photoUrl: photoUrlFor(row.photo_path),
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
  const { error } = await client
    .from('garage_entries')
    .delete()
    .eq('user_id', userId)
    .eq('slot', slot)

  if (error) throw error
  /* La foto queda huerfana en el bucket. Es barato y evita borrar algo que
     todavia se este mostrando en una pestana abierta; se limpia despues. */
}

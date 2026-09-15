import { describe, expect, it } from 'vitest'
import { BRAND } from '../config/brand'
import { contactMailto, instagramUrl, interestLabel, isContactEmail, normalizeInstagram } from './contact'

describe('normalizeInstagram', () => {
  it('acepta el usuario tal cual', () => {
    expect(normalizeInstagram('autos.juan_m')).toBe('autos.juan_m')
  })

  it('saca la arroba', () => {
    expect(normalizeInstagram('@autosjuan')).toBe('autosjuan')
  })

  it('saca el link entero, que es lo que pega la mayoría', () => {
    expect(normalizeInstagram('https://www.instagram.com/autosjuan/')).toBe('autosjuan')
    expect(normalizeInstagram('instagram.com/autosjuan')).toBe('autosjuan')
    /* Así se copia desde la app del celular. */
    expect(normalizeInstagram('https://instagram.com/autosjuan?igsh=MXRk')).toBe('autosjuan')
  })

  it('perdona los espacios alrededor', () => {
    expect(normalizeInstagram('  @autosjuan  ')).toBe('autosjuan')
  })

  it('vacío es null: el campo es opcional', () => {
    expect(normalizeInstagram('')).toBeNull()
    expect(normalizeInstagram('   ')).toBeNull()
  })

  it('algo que no es un usuario es undefined, distinto de vacío', () => {
    expect(normalizeInstagram('juan perez')).toBeUndefined()
    expect(normalizeInstagram('juan!')).toBeUndefined()
    expect(normalizeInstagram('a'.repeat(31))).toBeUndefined()
    expect(normalizeInstagram('https://instagram.com/')).toBeUndefined()
  })

  it('cumple la misma regla que la base', () => {
    /* Si el formulario dejara pasar algo que el check de la 014 rechaza, el
       guardado fallaría con un error de la base en vez de un aviso claro. */
    const base = /^[A-Za-z0-9._]{1,30}$/
    for (const raw of ['@a.b_c', 'https://instagram.com/x_y.z', 'ok123']) {
      const handle = normalizeInstagram(raw)
      expect(typeof handle).toBe('string')
      expect(base.test(handle as string)).toBe(true)
    }
  })
})

describe('instagramUrl', () => {
  it('arma el link del perfil', () => {
    expect(instagramUrl('autosjuan')).toBe('https://instagram.com/autosjuan')
  })
})

describe('isContactEmail', () => {
  it('acepta un mail común', () => {
    expect(isContactEmail('juan@gmail.com')).toBe(true)
    expect(isContactEmail('  ventas@agencia.com.ar ')).toBe(true)
  })

  it('rechaza lo que no tiene forma de mail', () => {
    expect(isContactEmail('juan')).toBe(false)
    expect(isContactEmail('juan@gmail')).toBe(false)
    expect(isContactEmail('juan @gmail.com')).toBe(false)
    expect(isContactEmail('')).toBe(false)
  })

  it('rechaza los larguísimos, igual que la base', () => {
    expect(isContactEmail(`${'a'.repeat(250)}@x.com`)).toBe(false)
  })
})

describe('contactMailto', () => {
  it('lleva el asunto con el auto, codificado', () => {
    expect(contactMailto('juan@gmail.com', 'Toyota Hilux')).toBe(
      `mailto:juan@gmail.com?subject=Consulta%20por%20el%20Toyota%20Hilux%20en%20${encodeURIComponent(BRAND)}`,
    )
  })
})

describe('interestLabel', () => {
  it('no dice nada en cero: un aviso nuevo no tiene por qué mostrar que no le interesa a nadie', () => {
    expect(interestLabel(0)).toBeNull()
  })

  it('usa singular con uno', () => {
    expect(interestLabel(1)).toBe('A 1 persona le interesa')
  })

  it('usa plural con más', () => {
    expect(interestLabel(12)).toBe('A 12 personas les interesa')
  })
})

import { z } from 'zod'

const today = new Date()
today.setHours(0, 0, 0, 0)

function isValidDate(value: string) {
    const parsed = new Date(value)
    return !Number.isNaN(parsed.getTime())
}

export const eventoFormSchema = z.object({
    titulo: z
        .string()
        .trim()
        .min(3, 'O titulo precisa ter ao menos 3 caracteres.')
        .max(100, 'O titulo pode ter no maximo 100 caracteres.'),
    descricao: z
        .string()
        .trim()
        .min(10, 'A descricao precisa ter ao menos 10 caracteres.')
        .max(500, 'A descricao pode ter no maximo 500 caracteres.'),
    data_evento: z
        .string()
        .refine(isValidDate, 'Data invalida.')
        .refine((value) => new Date(value) >= today, 'Não é possível criar evento em data passada.'),
    local: z
        .string()
        .trim()
        .min(3, 'O local precisa ter ao menos 3 caracteres.')
        .max(100, 'O local pode ter no maximo 100 caracteres.'),
    icone: z.enum(['churras', 'boxe', 'social', 'treino']),
    valor: z.coerce.number().min(0, 'O valor nao pode ser negativo.').nullable().optional(),
    imagem_url: z.string().trim().url('Imagem invalida.').nullable().optional().or(z.literal('')),
    destaque: z.boolean(),
})

export type EventoFormValues = z.infer<typeof eventoFormSchema>

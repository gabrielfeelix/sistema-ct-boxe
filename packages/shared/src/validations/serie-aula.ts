import { z } from 'zod'

function parseDateOnly(value: string): Date | null {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return null

    const parsed = new Date(Date.UTC(year, month - 1, day))
    if (Number.isNaN(parsed.getTime())) return null

    return parsed
}

function toMinutes(time: string) {
    const [hour, minute] = time.split(':').map(Number)
    return hour * 60 + minute
}

function isValidDate(value: string) {
    return parseDateOnly(value) !== null
}

const baseSerieAulaSchema = z.object({
    titulo: z
        .string()
        .trim()
        .min(3, 'O titulo precisa ter ao menos 3 caracteres.')
        .max(80, 'O titulo pode ter no maximo 80 caracteres.'),
    dia_semana: z.coerce
        .number()
        .int('Dia da semana invalido.')
        .min(0, 'Dia da semana invalido.')
        .max(6, 'Dia da semana invalido.'),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Horario de inicio invalido.'),
    hora_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Horario de termino invalido.'),
    categoria: z.enum(['infantil', 'adulto', 'todos']),
    tipo_aula: z.enum(['grupo', 'individual']),
    professor: z
        .string()
        .trim()
        .min(3, 'O nome do professor precisa ter ao menos 3 caracteres.')
        .max(60, 'O nome do professor pode ter no maximo 60 caracteres.'),
    capacidade_maxima: z.coerce.number().int('Capacidade maxima invalida.').min(1).max(100),
    ativo: z.boolean().default(true),
    data_inicio: z.string().refine(isValidDate, 'Data de inicio invalida.'),
    data_fim: z
        .string()
        .refine(isValidDate, 'Data de fim invalida.')
        .nullable()
        .optional(),
})

export const serieAulaSchema = baseSerieAulaSchema.superRefine((value, ctx) => {
    if (toMinutes(value.hora_fim) <= toMinutes(value.hora_inicio)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['hora_fim'],
            message: 'O horario de termino deve ser maior que o horario de inicio.',
        })
    }

    if (value.data_fim) {
        const inicio = parseDateOnly(value.data_inicio)
        const fim = parseDateOnly(value.data_fim)
        if (inicio && fim && fim.getTime() < inicio.getTime()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['data_fim'],
                message: 'A data de fim deve ser igual ou posterior a data de inicio.',
            })
        }
    }
})

export const atualizarSerieAulaSchema = baseSerieAulaSchema
    .partial()
    .superRefine((value, ctx) => {
        if (value.hora_inicio && value.hora_fim && toMinutes(value.hora_fim) <= toMinutes(value.hora_inicio)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['hora_fim'],
                message: 'O horario de termino deve ser maior que o horario de inicio.',
            })
        }

        if (value.data_inicio && value.data_fim) {
            const inicio = parseDateOnly(value.data_inicio)
            const fim = parseDateOnly(value.data_fim)
            if (inicio && fim && fim.getTime() < inicio.getTime()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['data_fim'],
                    message: 'A data de fim deve ser igual ou posterior a data de inicio.',
                })
            }
        }
    })

export type SerieAulaValues = z.infer<typeof serieAulaSchema>
export type AtualizarSerieAulaValues = z.infer<typeof atualizarSerieAulaSchema>

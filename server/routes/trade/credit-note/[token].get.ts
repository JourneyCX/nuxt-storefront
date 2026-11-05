import { serveDocumentLink } from '~/server/utils/tradeDocumentRoute'

// GET /trade/credit-note/{token}: the link in a credit-note mail (Session 8e). All rules are in tradeDocumentRoute / tradeDocument.
export default defineEventHandler((event) => serveDocumentLink(event, 'credit_note'))

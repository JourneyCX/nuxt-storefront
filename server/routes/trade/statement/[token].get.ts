import { serveDocumentLink } from '~/server/utils/tradeDocumentRoute'

// GET /trade/statement/{token}: the link in a statement mail (Session 8e). All rules are in tradeDocumentRoute / tradeDocument.
export default defineEventHandler((event) => serveDocumentLink(event, 'statement'))

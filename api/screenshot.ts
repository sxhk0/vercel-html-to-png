import { VercelRequest, VercelResponse } from '@vercel/node'

import chrome from 'chrome-aws-lambda'

/**
 * Handles a incoming request and generates a image from given HTML code.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') return response.status(404)

    const html = request.body
    if (!html) {
        return response.status(400).send('The "html" is required.')
    }

    const browser = await chrome.puppeteer.launch({
        args: [...chrome.args, "--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: await chrome.executablePath,
        defaultViewport: { width: 1280, height: 720 },
        headless: true
    })

    try {
        const page = await browser.newPage()

        // todo 🙃 always need to improve on html/css/js security

        await page.setContent(html, { waitUntil: 'networkidle2' })

        const targetElementInPage = await page.$('body')

        if (targetElementInPage) {
            const image = await targetElementInPage.screenshot({ omitBackground: true })

            await page.close()
            await browser.close()

            response.setHeader('Content-Type', 'image/png')

            return response.status(200).send(image)
        } else {
            response.status(400).send({ error: 'Cannot find <body> in your HTML.' })
        }
    } catch (error) {
        response.status(500).send({ error: error.message })
    }
}

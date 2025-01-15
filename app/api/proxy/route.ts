import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { method, url, headers, body } = await req.json()

    const response = await fetch(url, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(body),
    })

    const responseData = await response.text()
    let responseBody

    try {
      responseBody = JSON.parse(responseData)
    } catch {
      responseBody = responseData
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch' },
      { status: 500 }
    )
  }
}


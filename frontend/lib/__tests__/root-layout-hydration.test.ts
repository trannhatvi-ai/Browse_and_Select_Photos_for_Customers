import { readFileSync } from 'fs'
import { join } from 'path'

describe('RootLayout hydration boundary', () => {
  it('suppresses extension-added body attribute hydration warnings', () => {
    const layout = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8')

    expect(layout).toContain('<body className="font-sans antialiased" suppressHydrationWarning>')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  exportContributorsCSV,
  exportReposCSV,
  exportTrendsCSV,
} from './analytics'

const originalBlob = globalThis.Blob

function mockDownload() {
  let content
  vi.stubGlobal('Blob', class {
    constructor(parts) {
      content = parts.join('')
    }
  })
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(document, 'createElement').mockReturnValue({ click: vi.fn() })
  return () => content
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.stubGlobal('Blob', originalBlob)
})

describe('CSV exports', () => {
  it('neutralizes formula-triggering repository and organization strings', () => {
    const getContent = mockDownload()

    exportReposCSV([
      {
        name: '=cmd|\' /C calc\'!A0',
        orgLogin: '@attacker',
        stargazers_count: 1,
        forks_count: 2,
        open_issues_count: 3,
        healthScore: 4,
        activityClassification: 'Active',
        language: 'JavaScript',
        pushed_at: '2026-10-18T00:00:00Z',
      },
    ])

    expect(getContent()).toContain("'=cmd|' /C calc'!A0,'@attacker,1,2,3,4,Active,JavaScript,2026-10-18")
  })

  it('neutralizes formula-triggering contributor logins and preserves ordinary values', () => {
    const getContent = mockDownload()

    exportContributorsCSV([
      {
        login: '+https://attacker.example/leak',
        totalContribs: 2,
        repos: [{}],
        orgs: [{}],
        lastActive: '2026-10-18T00:00:00Z',
        isConnector: false,
        isCrossOrg: true,
      },
      {
        login: '-negative',
        totalContribs: 0,
        repos: [],
        orgs: [],
        lastActive: null,
        isConnector: false,
        isCrossOrg: false,
      },
      {
        login: '\tindented',
        totalContribs: 0,
        repos: [],
        orgs: [],
        lastActive: null,
        isConnector: false,
        isCrossOrg: false,
      },
      {
        login: '\rreturned',
        totalContribs: 0,
        repos: [],
        orgs: [],
        lastActive: null,
        isConnector: false,
        isCrossOrg: false,
      },
      {
        login: 'alice',
        totalContribs: 3,
        repos: [],
        orgs: [],
        lastActive: null,
        isConnector: true,
        isCrossOrg: false,
      },
    ])

    expect(getContent()).toContain("'+https://attacker.example/leak")
    expect(getContent()).toContain("'-negative")
    expect(getContent()).toContain("'\tindented")
    expect(getContent()).toContain("'\rreturned")
    expect(getContent()).toContain("alice,3,0,0,,true,false")
  })

  it('quotes delimiters and neutralizes formula-triggering trend values', () => {
    const getContent = mockDownload()

    exportTrendsCSV([{
      date: '-2026,10',
      prs_created: 1,
      prs_merged: 2,
      prs_closed: 3,
      issues_created: 4,
      issues_closed: 5,
    }])

    expect(getContent()).toContain('"\'-2026,10",1,2,3,4,5')
  })
})

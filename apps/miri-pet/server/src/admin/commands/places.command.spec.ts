import { type PlacesCommandServices, placesCommands } from './places.command'

const REPORT_ID = '0199e3a0-0000-7000-8000-0000000000b1'

const makeServices = () => {
  const lines: string[] = []
  const services = {
    places: {
      importFromFile: jest.fn(),
      listPendingReports: jest.fn(),
      approveReport: jest.fn(),
      rejectReport: jest.fn(),
    },
    print: (line: string) => {
      lines.push(line)
    },
  } satisfies PlacesCommandServices
  return { services, lines }
}

const run = (name: string, args: string[], services: ReturnType<typeof makeServices>['services']) => {
  const command = placesCommands.find((c) => c.name === name)
  if (!command) throw new Error(`${name} 없음`)
  return command.run(args, services)
}

describe('places:* admin 명령', () => {
  it('places:import, places:reports, places:approve, places:reject 4개를 제공한다', () => {
    expect(placesCommands.map((c) => c.name)).toEqual([
      'places:import',
      'places:reports',
      'places:approve',
      'places:reject',
    ])
  })

  it('places:import <file>: 결과 건수를 출력한다', async () => {
    const { services, lines } = makeServices()
    services.places.importFromFile.mockResolvedValue({
      upserted: 3,
      skipped: { missingCoordinates: 1, invalid: 2 },
    })
    await expect(run('places:import', ['places.json'], services)).resolves.toBe(0)
    expect(services.places.importFromFile).toHaveBeenCalledWith('places.json', { allowDevSamples: false })
    expect(lines.join('\n')).toBe('반영 3건 · 좌표 없음 건너뜀 1건 · 형식 오류 건너뜀 2건')
  })

  it('L6: places:import <file> --allow-dev-samples 플래그를 서비스로 넘긴다(순서 무관)', async () => {
    const { services } = makeServices()
    services.places.importFromFile.mockResolvedValue({ upserted: 0, skipped: { missingCoordinates: 0, invalid: 0 } })
    await run('places:import', ['dev.json', '--allow-dev-samples'], services)
    await run('places:import', ['--allow-dev-samples', 'dev.json'], services)
    expect(services.places.importFromFile.mock.calls).toEqual([
      ['dev.json', { allowDevSamples: true }],
      ['dev.json', { allowDevSamples: true }],
    ])
  })

  it('places:import 플래그만 있고 파일이 없으면 1', async () => {
    const { services } = makeServices()
    await expect(run('places:import', ['--allow-dev-samples'], services)).resolves.toBe(1)
    expect(services.places.importFromFile).not.toHaveBeenCalled()
  })

  it('places:import 파일 인자가 없으면 1', async () => {
    const { services } = makeServices()
    await expect(run('places:import', [], services)).resolves.toBe(1)
    expect(services.places.importFromFile).not.toHaveBeenCalled()
  })

  it('places:reports: 대기 제보를 한 줄씩(제어 문자 제거) 출력한다', async () => {
    const { services, lines } = makeServices()
    services.places.listPendingReports.mockResolvedValue([
      {
        id: REPORT_ID,
        createdAt: new Date('2026-10-15T00:00:00Z'),
        kind: 'EDIT',
        placeId: null,
        reporterId: null,
        summary: '이름\u001b[31m 바뀜\n',
        imageUrls: [],
      },
    ])
    await expect(run('places:reports', [], services)).resolves.toBe(0)
    expect(services.places.listPendingReports).toHaveBeenCalledWith(50)
    expect(lines).toEqual([`${REPORT_ID}\t2026-10-15T00:00:00.000Z\tEDIT\t-\t-\t이름[31m 바뀜`])
  })

  it('places:reports: 첨부 사진마다 짧은 presigned URL을 들여쓴 줄로 출력한다', async () => {
    const { services, lines } = makeServices()
    services.places.listPendingReports.mockResolvedValue([
      {
        id: REPORT_ID,
        createdAt: new Date('2026-10-15T00:00:00Z'),
        kind: 'NEW',
        placeId: null,
        reporterId: 'u-1',
        summary: '{}',
        imageUrls: ['https://r2.test/r/1.jpg?X-Amz-Expires=60', 'https://r2.test/r/2.jpg\u001b[0m'],
      },
    ])
    await run('places:reports', [], services)
    expect(lines).toEqual([
      `${REPORT_ID}\t2026-10-15T00:00:00.000Z\tNEW\t-\tu-1\t{}`,
      '  사진 1: https://r2.test/r/1.jpg?X-Amz-Expires=60',
      '  사진 2: https://r2.test/r/2.jpg[0m',
    ])
  })

  it('places:reports: 없으면 안내 문구', async () => {
    const { services, lines } = makeServices()
    services.places.listPendingReports.mockResolvedValue([])
    await run('places:reports', ['5'], services)
    expect(services.places.listPendingReports).toHaveBeenCalledWith(5)
    expect(lines).toEqual(['대기 중인 장소 제보가 없습니다'])
  })

  it('places:approve <id> → 반영된 장소 id 출력', async () => {
    const { services, lines } = makeServices()
    services.places.approveReport.mockResolvedValue({ placeId: 'p-1' })
    await expect(run('places:approve', [REPORT_ID], services)).resolves.toBe(0)
    expect(services.places.approveReport).toHaveBeenCalledWith(REPORT_ID)
    expect(lines[0]).toContain('p-1')
  })

  it('places:reject <id>', async () => {
    const { services, lines } = makeServices()
    services.places.rejectReport.mockResolvedValue(undefined)
    await expect(run('places:reject', [REPORT_ID], services)).resolves.toBe(0)
    expect(services.places.rejectReport).toHaveBeenCalledWith(REPORT_ID)
    expect(lines[0]).toContain(REPORT_ID)
  })

  it.each(['places:approve', 'places:reject'])('%s id가 없으면 1', async (name) => {
    const { services } = makeServices()
    await expect(run(name, [], services)).resolves.toBe(1)
  })
})

import { File } from 'expo-file-system'

// 기기 파일 읽기(네이티브 경계). txt 원문은 이 기기 메모리에서만 파싱하고 저장·전송·로그하지 않는다
export const readTextFile = (uri: string): Promise<string> => new File(uri).text()

export const readFileSize = (uri: string): number => new File(uri).size

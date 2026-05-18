// 추천 3종(신국판/A5/46판)을 먼저 둔다. 자가출판 플랫폼에서 규격이
// 통일돼 있어 추가 조정이 거의 필요 없는 판형들이다. 여백 기본값은
// 위·아래 약 20~30mm, 안쪽(제본)은 30~40mm로 넉넉히 잡는다.
// margin.left = 안쪽(제본), margin.right = 바깥쪽 (좌철 기준)
export const FORMATS = {
  sinkuk: {
    name: '신국판',
    use: '소설·에세이',
    recommended: true,
    width: '152mm',
    height: '225mm',
    margin: { top: '25mm', right: '20mm', bottom: '25mm', left: '35mm' },
    bodyFontSize: '10pt',
  },
  a5: {
    name: 'A5(국판)',
    use: '단행본·시집',
    recommended: true,
    width: '148mm',
    height: '210mm',
    margin: { top: '22mm', right: '18mm', bottom: '22mm', left: '32mm' },
    bodyFontSize: '10pt',
  },
  sayuk: {
    name: '46판',
    use: '시집·에세이',
    recommended: true,
    width: '127mm',
    height: '188mm',
    margin: { top: '20mm', right: '16mm', bottom: '20mm', left: '30mm' },
    bodyFontSize: '9.5pt',
  },
  crown: {
    name: '크라운판',
    use: '대형 단행본',
    recommended: false,
    width: '176mm',
    height: '248mm',
    margin: { top: '25mm', right: '20mm', bottom: '25mm', left: '32mm' },
    bodyFontSize: '10.5pt',
  },
  kukbae: {
    name: '국배판 (A4)',
    use: '문제집·실용서',
    recommended: false,
    width: '210mm',
    height: '297mm',
    margin: { top: '25mm', right: '22mm', bottom: '25mm', left: '35mm' },
    bodyFontSize: '11pt',
  },
};

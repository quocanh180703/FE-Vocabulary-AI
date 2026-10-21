/**
 * Utility for AI Vocabulary Explanation prompts and structured fallbacks
 */

export function buildExplainPrompt(
  targetWord: string,
  meta?: { partOfSpeech?: string; level?: string; vietnameseMeaning?: string }
): string {
  const extraDetails: string[] = [];
  if (meta?.partOfSpeech) extraDetails.push(`từ loại: ${meta.partOfSpeech}`);
  if (meta?.level) extraDetails.push(`cấp độ CEFR: ${meta.level}`);
  if (meta?.vietnameseMeaning) extraDetails.push(`nghĩa tiếng Việt: "${meta.vietnameseMeaning}"`);
  const extraStr = extraDetails.length > 0 ? ` (${extraDetails.join(', ')})` : '';

  return `Bạn là trợ lý AI học tiếng Anh thông minh Vi. Hãy giải thích chuyên sâu từ vựng tiếng Anh "${targetWord}"${extraStr} theo ĐÚNG form và cấu trúc 5 phần sau bằng tiếng Việt:

### 1. 💡 Ví dụ thực tế
- Cung cấp ít nhất 2 câu ví dụ thực tế bằng tiếng Anh có dùng từ "${targetWord}", kèm bản dịch nghĩa tiếng Việt chuẩn xác và tự nhiên ngay bên dưới mỗi câu (định dạng: *(Bản dịch tiếng Việt)*).

### 2. 🔗 Synonyms & Antonyms
- **Antonyms (Từ trái nghĩa):** Liệt kê các từ trái nghĩa thông dụng nhất (định dạng từng dòng: Word: Nghĩa tiếng Việt).
- **Synonyms (Từ đồng nghĩa):** Liệt kê các từ đồng nghĩa thông dụng nhất (định dạng từng dòng: Word: Nghĩa tiếng Việt).

### 3. 🎯 Ngữ cảnh sử dụng
- Phân tích rõ ngữ cảnh, sắc thái khi sử dụng (trang trọng, thân mật, học thuật, giao tiếp thường ngày, công sở...), các tình huống nên dùng và các kết hợp từ (collocations) thường gặp.

### 4. ⚠️ Lỗi thường gặp
- Chỉ ra các lỗi sai mà người học Việt Nam hay mắc phải khi sử dụng từ này (ví dụ: phát âm nhầm lẫn, dùng sai giới từ, nhầm lẫn từ loại hoặc nhầm với từ khác dễ gây hiểu nhầm).

### 5. 🧠 Mẹo ghi nhớ
- Đưa ra phương pháp hoặc mẹo nhớ nhanh (liên tưởng hình ảnh sinh động, quy tắc từ vựng hoặc câu chuyện ngắn) giúp nhớ từ sâu và lâu.

Lưu ý: Bắt buộc trình bày đầy đủ cả 5 phần trên theo đúng tiêu đề markdown rõ ràng, không được bỏ sót phần nào.`;
}

export function generateFallbackExplanation(
  targetWord: string,
  level?: string,
  pos?: string,
  vietnameseMeaning?: string
): string {
  const vn = vietnameseMeaning ? ` (mang nghĩa "${vietnameseMeaning}")` : '';
  const part = pos ? `từ loại: ${pos}` : 'từ vựng';
  const lvl = level ? `cấp độ ${level}` : 'thông dụng';

  return `### 1. 💡 Ví dụ thực tế
- It is essential to understand how "${targetWord}" is applied in daily communication.
  *(Điều cốt lõi là hiểu được cách "${targetWord}" được ứng dụng trong giao tiếp hàng ngày.)*
- Regular practice with "${targetWord}" will help you express ideas much more naturally.
  *(Luyện tập thường xuyên với "${targetWord}" sẽ giúp bạn diễn đạt ý tưởng tự nhiên hơn rất nhiều.)*

### 2. 🔗 Synonyms & Antonyms
- **Antonyms (Từ trái nghĩa):**
  - Ignore: phớt lờ, bỏ qua
  - Neglect: sao nhãng, bỏ bê
- **Synonyms (Từ đồng nghĩa):**
  - Practice: luyện tập, thực hành
  - Master: thành thạo, nắm vững
  - Express: diễn đạt, biểu đạt

### 3. 🎯 Ngữ cảnh sử dụng
- "${targetWord}" là một ${part} thuộc ${lvl}${vn}. Thường được sử dụng phổ biến trong giao tiếp hàng ngày, bài thi năng lực tiếng Anh và môi trường làm việc chuyên nghiệp.
- Sắc thái: Tự nhiên, chuẩn mực, phù hợp trong cả văn nói và văn viết.

### 4. ⚠️ Lỗi thường gặp
- Phát âm: Người học Việt Nam thường nuốt âm cuối (ending sounds) hoặc phát âm sai trọng âm. Hãy luyện nghe phát âm mẫu để chuẩn hóa âm vị IPA.
- Dùng từ: Tránh dịch nguyên văn (word-by-word) từ tiếng Việt sang tiếng Anh; hãy chú ý giới từ và cấu trúc cụm từ đi liền với "${targetWord}".

### 5. 🧠 Mẹo ghi nhớ
- Đặt ngay 1 câu ví dụ thực tế gắn liền với chính công việc hoặc sở thích của bạn có dùng từ "${targetWord}".
- Nhắm mắt lại, liên tưởng hình ảnh trực quan sinh động và đọc to câu đó 3 lần để kích hoạt trí nhớ dài hạn!`;
}

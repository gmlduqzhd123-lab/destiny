/**
 * [Data] 🌐 다국어 화면 (English · 中文 · Tiếng Việt) — 다문화 학생을 위한 화면 글자와 핵심 결과 요약
 * 자세한 풀이 문장은 한국어 원문을 유지하고, 🔊 읽어 주기로 들을 수 있습니다.
 */
const I18nData = {
    langs: { ko: '한국어', en: 'English', zh: '中文', vi: 'Tiếng Việt' },
    htmlLang: { ko: 'ko', en: 'en', zh: 'zh-Hans', vi: 'vi' },
    speech: { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', vi: 'vi-VN' },

    // [선택자, 바꿀 곳(text·ph·tail·head·aria), 번역]
    ui: [
        ['#modeSwitch [data-mode=student]', 'text', { en: '🌱 Student', zh: '🌱 学生', vi: '🌱 Học sinh' }],
        ['#modeSwitch [data-mode=teacher]', 'text', { en: '🏫 Teacher', zh: '🏫 教师', vi: '🏫 Giáo viên' }],
        ['#brandDesc', 'text', { en: 'Find your starlight nature and friendship compass', zh: '寻找属于你的星光气质与友情罗盘', vi: 'Khám phá tính cách ánh sao và la bàn tình bạn của bạn' }],
        ['#teaser .sim-link', 'text', { en: '☀️ Explore the 24 solar terms', zh: '☀️ 看看二十四节气太阳之旅', vi: '☀️ Khám phá 24 tiết khí' }],
        ['#labelUserName', 'text', { en: 'Name (or nickname)', zh: '姓名（或昵称）', vi: 'Tên (hoặc biệt danh)' }],
        ['#userName', 'ph', { en: 'e.g. Star Kim (nicknames are fine)', zh: '例：金星光（昵称也可以）', vi: 'Ví dụ: Sao Kim (biệt danh cũng được)' }],
        ['label[for=birthDate]', 'text', { en: 'Date of birth', zh: '出生日期', vi: 'Ngày sinh' }],
        ['.seg[data-for=calType] [data-v=solar]', 'text', { en: 'Solar', zh: '阳历', vi: 'Dương lịch' }],
        ['.seg[data-for=calType] [data-v=lunar]', 'text', { en: 'Lunar', zh: '农历', vi: 'Âm lịch' }],
        ['#birthDate', 'ph', { en: 'e.g. 2015.05.05', zh: '例：2015.05.05', vi: 'Ví dụ: 2015.05.05' }],
        ['#leapWrap', 'tail', { en: ' Born in a leap month', zh: ' 出生在闰月', vi: ' Sinh vào tháng nhuận' }],
        ['#capGender', 'text', { en: 'Gender', zh: '性别', vi: 'Giới tính' }],
        ['#btnGenderF', 'text', { en: 'Girl', zh: '女孩', vi: 'Nữ' }],
        ['#btnGenderM', 'text', { en: 'Boy', zh: '男孩', vi: 'Nam' }],
        ['#capMbtiText', 'text', { en: 'MBTI type', zh: 'MBTI 类型', vi: 'Kiểu MBTI' }],
        ['#btnMbtiQuiz', 'text', { en: 'Find it with 4 questions', zh: '用4个问题找一找', vi: 'Tìm bằng 4 câu hỏi' }],
        ['#mbtiPick [data-v=E] small', 'text', { en: 'Outgoing', zh: '外向', vi: 'Hướng ngoại' }],
        ['#mbtiPick [data-v=I] small', 'text', { en: 'Reserved', zh: '内向', vi: 'Hướng nội' }],
        ['#mbtiPick [data-v=S] small', 'text', { en: 'Sensing', zh: '感觉', vi: 'Giác quan' }],
        ['#mbtiPick [data-v=N] small', 'text', { en: 'Intuition', zh: '直觉', vi: 'Trực giác' }],
        ['#mbtiPick [data-v=T] small', 'text', { en: 'Thinking', zh: '思考', vi: 'Lý trí' }],
        ['#mbtiPick [data-v=F] small', 'text', { en: 'Feeling', zh: '共情', vi: 'Cảm xúc' }],
        ['#mbtiPick [data-v=J] small', 'text', { en: 'Planning', zh: '计划', vi: 'Kế hoạch' }],
        ['#mbtiPick [data-v=P] small', 'text', { en: 'Flexible', zh: '灵活', vi: 'Linh hoạt' }],
        ['#timeMore summary', 'text', { en: 'Add birth time & place (optional)', zh: '添加出生时间和地区（可选）', vi: 'Thêm giờ và nơi sinh (không bắt buộc)' }],
        ['.remember-wrap', 'tail', { en: ' Remember me next time (this device only)', zh: ' 下次直接查看（只保存在本设备）', vi: ' Ghi nhớ cho lần sau (chỉ trên thiết bị này)' }],
        ['#btnSubmit', 'text', { en: 'Open my Star Compass', zh: '打开我的星光罗盘', vi: 'Mở la bàn ánh sao của tôi' }],
        ['#btnQuick', 'text', { en: 'Open today’s Star Compass', zh: '直接查看今天的星光罗盘', vi: 'Xem la bàn ánh sao hôm nay' }],
        ['#btnEditInfo', 'text', { en: 'Use someone else’s info', zh: '换成别人的信息', vi: 'Dùng thông tin của người khác' }],
        ['#btnToneGentle', 'text', { en: 'Gentle', zh: '温柔', vi: 'Nhẹ nhàng' }],
        ['#btnToneDirect', 'text', { en: 'Honest', zh: '坦率', vi: 'Thẳng thắn' }],
        ['#omiTitleText', 'text', { en: 'Today’s star draw', zh: '今日星光签', vi: 'Rút sao hôm nay' }],
        ['#omiGuideText', 'text', { en: 'Tap the star box to draw today’s luck', zh: '点一下星光筒，抽出今天的运气', vi: 'Chạm vào hộp sao để rút vận may hôm nay' }],
        ['#todaySummaryTitle', 'text', { en: 'Today’s Star Compass', zh: '今日星光罗盘', vi: 'La bàn ánh sao hôm nay' }],
        ['#themeCardTitle', 'text', { en: 'Today’s three star scores', zh: '今天的三个星光指数', vi: 'Ba chỉ số ánh sao hôm nay' }],
        ['#labelLove', 'text', { en: 'Friendship', zh: '友情运', vi: 'Tình bạn' }],
        ['#labelMoney', 'text', { en: 'Curiosity · Creativity', zh: '探究 · 创意', vi: 'Tò mò · Sáng tạo' }],
        ['#labelWork', 'text', { en: 'Learning · Focus', zh: '学习 · 专注', vi: 'Học tập · Tập trung' }],
        ['#adviceCardTitle', 'text', { en: 'MBTI advice & today’s promise', zh: 'MBTI 建议与今日小目标', vi: 'Lời khuyên MBTI & lời hứa hôm nay' }],
        ['#missionLabel', 'text', { en: 'Today’s small action', zh: '今天的小实践', vi: 'Việc nhỏ hôm nay' }],
        ['#gaewunTitleText', 'text', { en: 'Lucky items', zh: '带来好运的星光物品', vi: 'Vật phẩm may mắn' }],
        ['#quoteCardTitle', 'text', { en: 'Today’s classic quote', zh: '今日经典名言', vi: 'Câu nói hay hôm nay' }],
        ['#keepsakeTitleText', 'text', { en: 'Make a star card', zh: '制作星光图鉴卡', vi: 'Tạo thẻ ánh sao' }],
        ['#btnSaveCard', 'text', { en: 'Save image', zh: '保存图片', vi: 'Lưu ảnh' }],
        ['#btnShare', 'text', { en: 'Share', zh: '分享', vi: 'Chia sẻ' }],
        ['#sajuTitleText', 'text', { en: 'My time code (four pillars)', zh: '我的时间密码（四柱）', vi: 'Mật mã thời gian (bốn trụ)' }],
        ['#ilganCardTitle', 'text', { en: 'My nature character', zh: '代表我的自然角色', vi: 'Nhân vật thiên nhiên của tôi' }],
        ['#amuletTitleText', 'text', { en: 'My cheering charm', zh: '为我加油的星光护身符', vi: 'Bùa cổ vũ của tôi' }],
        ['#dexTitleText', 'text', { en: '🌟 Nature character collection', zh: '🌟 自然角色图鉴', vi: '🌟 Bộ sưu tập nhân vật' }],
        ['#btnDexQr', 'text', { en: '📱 My character QR', zh: '📱 我的角色二维码', vi: '📱 Mã QR nhân vật' }],
        ['#btnDexCode', 'text', { en: '⌨️ Enter a friend’s code', zh: '⌨️ 输入朋友的代码', vi: '⌨️ Nhập mã của bạn' }],
        ['#compatFormTitle', 'text', { en: 'Friendship chemistry', zh: '同桌 · 小组友情默契', vi: 'Độ hợp tình bạn' }],
        ['#pName', 'ph', { en: 'Friend’s name', zh: '朋友的名字', vi: 'Tên bạn' }],
        ['#btnCompatSubmit', 'text', { en: 'Check our chemistry', zh: '查看友情默契', vi: 'Xem độ hợp nhau' }],
        ['#compatResultTitle', 'text', { en: 'Our friendship chemistry', zh: '我们的友情默契', vi: 'Độ hợp của chúng ta' }],
        ['#tarotTitleText', 'text', { en: 'Symbol story cards', zh: '象征故事 · 心灵卡片', vi: 'Thẻ câu chuyện biểu tượng' }],
        ['#journalTitleText', 'text', { en: 'Starlight mood calendar', zh: '星光心情日历', vi: 'Lịch tâm trạng ánh sao' }],
        ['#memoTitleText', 'text', { en: 'How was your day?', zh: '今天的心情天气如何？', vi: 'Hôm nay bạn thấy thế nào?' }],
        ['#btnMemoSave', 'text', { en: 'Save diary', zh: '保存日记', vi: 'Lưu nhật ký' }],
        ['#btnReset', 'text', { en: 'See someone else’s compass', zh: '看看别人的罗盘', vi: 'Xem la bàn của người khác' }],
        ['#tabLabelToday', 'text', { en: 'Today', zh: '今天', vi: 'Hôm nay' }],
        ['#tabLabelSaju', 'text', { en: 'Nature', zh: '气质', vi: 'Tính cách' }],
        ['#tabLabelCompat', 'text', { en: 'Friends', zh: '友情', vi: 'Bạn bè' }],
        ['#tabLabelTarot', 'text', { en: 'Cards', zh: '卡片', vi: 'Thẻ' }],
        ['#tabLabelJournal', 'text', { en: 'Diary', zh: '日记', vi: 'Nhật ký' }],
        ['#footerNoteText', 'text', {
            en: 'Star Compass is a self-discovery tool for finding your and your friends’ strengths. Your own choices are the most important compass!',
            zh: '星光罗盘是发现自己和朋友优点的自我了解工具。最重要的罗盘是你的选择和心态！',
            vi: 'La bàn ánh sao là công cụ tự khám phá để tìm điểm mạnh của bạn và bạn bè. La bàn quan trọng nhất là lựa chọn của chính bạn!'
        }],
        ['#simTitle', 'head', { en: '☀️ 24 solar terms journey ', zh: '☀️ 二十四节气太阳之旅 ', vi: '☀️ Hành trình 24 tiết khí ' }],
        ['.kiosk-label', 'text', { en: '🔒 Shared device mode · nothing is saved', zh: '🔒 公用设备模式 · 信息不会被保存', vi: '🔒 Chế độ máy dùng chung · không lưu thông tin' }],
        ['#btnNextPerson', 'text', { en: 'Next friend ▶', zh: '下一位同学 ▶', vi: 'Bạn tiếp theo ▶' }]
    ],

    // 핵심 결과 요약 카드에 쓰는 말
    summary: {
        en: { title: '🌐 Summary in English', character: 'Your nature character', strengths: 'Strengths', luck: 'Today’s luck', drawFirst: 'Tap the star box above to draw today’s luck!', scores: 'Today’s scores', lucky: 'Lucky things', element: 'Energy to fill', color: 'Color', number: 'Number', direction: 'Direction', note: 'Detailed readings are in Korean. Tap 🔊 to listen.' },
        zh: { title: '🌐 中文摘要', character: '你的自然角色', strengths: '优点', luck: '今日运势', drawFirst: '点上面的星光筒，抽出今天的运气吧！', scores: '今日指数', lucky: '幸运物', element: '需要补充的能量', color: '颜色', number: '数字', direction: '方向', note: '详细解读为韩语。点 🔊 可以收听。' },
        vi: { title: '🌐 Tóm tắt tiếng Việt', character: 'Nhân vật thiên nhiên của bạn', strengths: 'Điểm mạnh', luck: 'Vận may hôm nay', drawFirst: 'Chạm vào hộp sao phía trên để rút vận may hôm nay!', scores: 'Chỉ số hôm nay', lucky: 'Điều may mắn', element: 'Năng lượng cần bổ sung', color: 'Màu', number: 'Số', direction: 'Hướng', note: 'Phần giải thích chi tiết bằng tiếng Hàn. Chạm 🔊 để nghe.' }
    },

    // 자연물 캐릭터 10종 (일간 순서: 甲乙丙丁戊己庚辛壬癸)
    chars: [
        { en: ['A tall, straight tree', 'A natural leader with an honest heart who keeps growing toward the goal.', 'Drive · Responsibility · Growth'], zh: ['笔直高大的树', '心地正直、天生的领导者，朝着目标不断成长。', '行动力 · 责任感 · 成长力'], vi: ['Cây lớn thẳng tắp', 'Người dẫn đầu ngay thẳng, luôn vươn lên hướng tới mục tiêu.', 'Quyết tâm · Trách nhiệm · Phát triển'] },
        { en: ['Grass and flowers that never break', 'Gentle and flexible; gets along anywhere and warmly connects friends.', 'Adaptability · Friendliness · Persistence'], zh: ['坚韧不折的花草', '温柔灵活，在哪里都能融洽相处，把朋友们温暖地连在一起。', '适应力 · 亲和力 · 毅力'], vi: ['Hoa cỏ không gãy', 'Mềm mại, linh hoạt, hòa hợp ở mọi nơi và kết nối bạn bè ấm áp.', 'Thích nghi · Thân thiện · Kiên trì'] },
        { en: ['The sun that lights up the world', 'Bright, energetic and honest; shares cheerful energy with everyone.', 'Passion · Expression · Positivity'], zh: ['照亮世界的太阳', '开朗、充满活力又坦率，把快乐的能量分享给大家。', '热情 · 表达力 · 正能量'], vi: ['Mặt trời soi sáng thế gian', 'Tươi sáng, tràn đầy năng lượng và thẳng thắn, lan tỏa niềm vui cho mọi người.', 'Nhiệt huyết · Diễn đạt · Tích cực'] },
        { en: ['A candle that brightens the dark', 'Warm and thoughtful; focuses deeply on what they love.', 'Focus · Kindness · Deep thinking'], zh: ['照亮黑暗的烛光', '温暖细腻，专注于自己喜欢的事情。', '专注力 · 体贴 · 深思'], vi: ['Ngọn nến xua tan bóng tối', 'Ấm áp, tinh tế và tập trung sâu vào điều mình yêu thích.', 'Tập trung · Chu đáo · Suy nghĩ sâu sắc'] },
        { en: ['A great, steady mountain', 'Reliable and calm; not easily shaken and embraces others.', 'Trust · Generosity · Steadiness'], zh: ['稳稳屹立的大山', '可靠沉稳，不轻易动摇，能包容身边的人。', '可信赖 · 包容力 · 坚定'], vi: ['Ngọn núi lớn vững chãi', 'Đáng tin cậy, điềm tĩnh, không dễ dao động và bao dung mọi người.', 'Đáng tin · Bao dung · Vững vàng'] },
        { en: ['A field that grows crops', 'Calm and practical; carefully looks after others and helps things grow.', 'Practicality · Care · Attention to detail'], zh: ['孕育庄稼的田地', '沉稳务实，细心照顾身边的人，让一切慢慢成长。', '务实 · 体贴 · 细心'], vi: ['Cánh đồng nuôi lớn mùa màng', 'Điềm đạm, thực tế, chăm sóc người khác chu đáo và giúp mọi thứ lớn lên.', 'Thực tế · Quan tâm · Cẩn thận'] },
        { en: ['Solid rock and iron', 'Decisive and loyal, with a clear sense of right and wrong.', 'Decisiveness · Loyalty · Justice'], zh: ['坚硬的岩石与钢铁', '果断讲义气，是非分明。', '决断力 · 义气 · 正义感'], vi: ['Đá cứng và sắt thép', 'Quyết đoán, trung thành và phân biệt rõ đúng sai.', 'Quyết đoán · Trung thành · Chính nghĩa'] },
        { en: ['A sparkling gem', 'Neat and detailed, with an eye for beauty and clear standards.', 'Sense of beauty · Precision · Clear standards'], zh: ['闪闪发光的宝石', '细致整洁，懂得欣赏美，有自己清楚的标准。', '审美力 · 精细 · 原则'], vi: ['Viên ngọc lấp lánh', 'Gọn gàng, tỉ mỉ, biết cảm nhận cái đẹp và có tiêu chuẩn rõ ràng.', 'Thẩm mỹ · Tỉ mỉ · Nguyên tắc'] },
        { en: ['A wide river and sea', 'Open-minded and wise; sees the big picture and finds new paths.', 'Wisdom · Open heart · Creative thinking'], zh: ['奔流的江河与大海', '心胸开阔、富有智慧，能看到全局并找到新的道路。', '智慧 · 包容 · 创造性思维'], vi: ['Sông lớn và biển rộng', 'Rộng lượng và thông thái, nhìn thấy bức tranh lớn và tìm ra lối đi mới.', 'Trí tuệ · Rộng lượng · Tư duy sáng tạo'] },
        { en: ['Gentle rain and dew', 'Deeply empathetic and observant; quietly helps others like spring rain.', 'Empathy · Observation · Sensitivity'], zh: ['润物无声的雨露', '富有同理心、观察力强，像春雨一样默默帮助别人。', '同理心 · 观察力 · 细腻'], vi: ['Mưa và sương thấm nhẹ', 'Giàu lòng đồng cảm, tinh ý, lặng lẽ giúp đỡ người khác như mưa xuân.', 'Đồng cảm · Quan sát · Tinh tế'] }
    ],

    // 오늘의 점괘 (ExtraData.grades의 name 기준)
    grades: {
        대길: { en: ['Great luck', 'The day the starlight shines brightest'], zh: ['大吉', '星光最闪亮的一天'], vi: ['Đại cát', 'Ngày ánh sao rực rỡ nhất'] },
        길: { en: ['Good luck', 'A day when things go smoothly'], zh: ['吉', '一切顺顺利利的一天'], vi: ['Cát', 'Ngày mọi việc suôn sẻ'] },
        소길: { en: ['Little luck', 'Small joys and smiles come your way'], zh: ['小吉', '小小的快乐和笑容来到身边'], vi: ['Tiểu cát', 'Niềm vui nhỏ và nụ cười ghé thăm'] },
        평: { en: ['Calm', 'A calm and peaceful day'], zh: ['平', '平静安宁的一天'], vi: ['Bình', 'Một ngày bình yên'] },
        신중: { en: ['Take care', 'A good day to go slowly and carefully'], zh: ['慎', '慢慢来、仔细看会更好的一天'], vi: ['Thận trọng', 'Ngày nên chậm rãi và cẩn thận'] }
    },

    // 오늘의 한 줄 (십신, 학생용)
    plain: {
        bigyeon: { en: 'A day your independence and friendships grow', zh: '自立能力和友情一起成长的一天', vi: 'Ngày sức tự lập và tình bạn cùng lớn lên' },
        geopjae: { en: 'A day for brave challenges — and for sharing', zh: '需要勇敢挑战也需要谦让的一天', vi: 'Ngày cần tinh thần thử thách và cả sự nhường nhịn' },
        siksin: { en: 'A day imagination and expression flow easily', zh: '想象力和表达力源源不断的一天', vi: 'Ngày trí tưởng tượng và khả năng diễn đạt tuôn trào' },
        sanggwan: { en: 'A day to add kind words to your sparkling wit', zh: '在灵巧的机智上加一点温柔话语的一天', vi: 'Ngày thêm lời nói dịu dàng vào sự lanh lợi của bạn' },
        pyeonjae: { en: 'A day lively activities and new curiosity open up', zh: '活力满满、新的好奇心打开的一天', vi: 'Ngày hoạt động sôi nổi và sự tò mò mới mở ra' },
        jeongjae: { en: 'A day as rewarding as you carefully prepare', zh: '认真准备多少就收获多少的一天', vi: 'Ngày chăm chỉ bao nhiêu thì xứng đáng bấy nhiêu' },
        pyeongwan: { en: 'A day to bravely overcome a tough task and grow', zh: '勇敢克服难题、长高一截的一天', vi: 'Ngày dũng cảm vượt qua thử thách và trưởng thành' },
        jeonggwan: { en: 'A day you are praised for good manners and keeping promises', zh: '因端正的态度和守约而受到称赞的一天', vi: 'Ngày được khen vì thái độ đúng mực và giữ lời hứa' },
        pyeonin: { en: 'A great day for quiet reading and deep exploring', zh: '适合安静读书、深入探究的一天', vi: 'Ngày thích hợp đọc sách yên tĩnh và tìm tòi sâu' },
        jeongin: { en: 'A day warm help and the joy of learning arrive', zh: '温暖的帮助和学习的快乐到来的一天', vi: 'Ngày sự giúp đỡ ấm áp và niềm vui học tập đến' }
    },

    // 첫 화면 오늘의 기운
    dayEl: {
        wood: { en: '🌱 A wood-energy day · great for starting to learn something new', zh: '🌱 木气流动的日子 · 适合开始新的学习和挑战', vi: '🌱 Ngày khí Mộc · tốt để bắt đầu học điều mới' },
        fire: { en: '☀️ A fire-energy day · great for speaking up and expressing yourself', zh: '☀️ 火气流动的日子 · 适合大声发表和表达自己', vi: '☀️ Ngày khí Hỏa · tốt để phát biểu và thể hiện bản thân' },
        earth: { en: '⛰️ An earth-energy day · great for caring for friends and building basics', zh: '⛰️ 土气流动的日子 · 适合体贴朋友、打好基础', vi: '⛰️ Ngày khí Thổ · tốt để quan tâm bạn bè và củng cố nền tảng' },
        metal: { en: '💎 A metal-energy day · great for tidying up and finishing neatly', zh: '💎 金气流动的日子 · 适合整理书桌、干净利落地收尾', vi: '💎 Ngày khí Kim · tốt để dọn dẹp và hoàn thành gọn gàng' },
        water: { en: '💧 A water-energy day · great for reading and deep thinking', zh: '💧 水气流动的日子 · 适合读书和深入思考', vi: '💧 Ngày khí Thủy · tốt để đọc sách và suy nghĩ sâu' }
    },

    elements: {
        wood: { en: 'Wood', zh: '木', vi: 'Mộc' }, fire: { en: 'Fire', zh: '火', vi: 'Hỏa' }, earth: { en: 'Earth', zh: '土', vi: 'Thổ' },
        metal: { en: 'Metal', zh: '金', vi: 'Kim' }, water: { en: 'Water', zh: '水', vi: 'Thủy' }
    },
    colors: {
        wood: { en: 'Green · Mint', zh: '绿色 · 薄荷色', vi: 'Xanh lá · Bạc hà' }, fire: { en: 'Red · Coral', zh: '红色 · 珊瑚色', vi: 'Đỏ · San hô' },
        earth: { en: 'Yellow · Beige', zh: '黄色 · 米色', vi: 'Vàng · Be' }, metal: { en: 'White · Silver', zh: '白色 · 银色', vi: 'Trắng · Bạc' },
        water: { en: 'Blue · Navy', zh: '蓝色 · 藏青色', vi: 'Xanh dương · Xanh navy' }
    },
    directions: {
        동쪽: { en: 'East', zh: '东', vi: 'Đông' }, 서쪽: { en: 'West', zh: '西', vi: 'Tây' }, 남쪽: { en: 'South', zh: '南', vi: 'Nam' },
        북쪽: { en: 'North', zh: '北', vi: 'Bắc' }, 중앙: { en: 'Center', zh: '中央', vi: 'Trung tâm' }
    },

    reader: {
        ko: { play: '소리로 읽어 주기', stop: '읽기 멈추기' },
        en: { play: 'Read aloud', stop: 'Stop reading' },
        zh: { play: '朗读', stop: '停止朗读' },
        vi: { play: 'Đọc to', stop: 'Dừng đọc' }
    }
};

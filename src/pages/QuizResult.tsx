import { useLocation, useNavigate } from 'react-router-dom';
import type { QuizResult as R } from '../api';
import { Mascot, Icon } from '../components/icons';

export default function QuizResult() {
  const { state } = useLocation() as { state?: { result: R; title?: string } };
  const nav = useNavigate();
  const r = state?.result;

  if (!r) return (
    <div className="content narrow center" style={{ paddingTop: 80 }}>
      <div className="sub">Không có kết quả để hiển thị.</div>
      <button className="btn mt16" onClick={() => nav('/quiz')}>Về danh sách quiz</button>
    </div>
  );

  const pct = r.totalQuestions > 0 ? Math.round((r.correctAnswers / r.totalQuestions) * 100) : Math.round(r.score || 0);
  const R_ = 54, C = 2 * Math.PI * R_;

  return (
    <div className="content narrow center" style={{ paddingTop: 30 }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          color: '#D97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)',
        }}
      >
        <Icon n="trophy" s={44} />
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--ink)' }}>
        {pct >= 80 ? 'Xuất sắc! 🎉' : pct >= 50 ? 'Khá tốt! 👏' : 'Cố gắng thêm nhé! 💪'}
      </h1>
      <div className="sub mt8" style={{ fontSize: 16 }}>
        Bạn đã trả lời đúng <b>{r.correctAnswers}/{r.totalQuestions}</b> câu trắc nghiệm{r.score !== undefined && r.score !== pct ? ` · Đạt ${r.score} điểm` : ''}
      </div>

      <div style={{ margin: '28px auto 20px', width: 140 }}>
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle cx="70" cy="70" r={R_} fill="none" stroke="var(--line)" strokeWidth="12" />
          <circle
            cx="70"
            cy="70"
            r={R_}
            fill="none"
            stroke={pct >= 80 ? '#10B981' : pct >= 50 ? '#4F46E5' : '#F59E0B'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
          <text x="70" y="78" textAnchor="middle" fontSize="32" fontWeight="900" fill="var(--ink)">
            {pct}%
          </text>
          <text x="70" y="96" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--muted)">
            CHÍNH XÁC
          </text>
        </svg>
      </div>

      <div className="cols3" style={{ textAlign: 'center', gap: 14 }}>
        <div className="card" style={{ padding: '16px 14px', borderRadius: 16 }}>
          <div className="sub" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon n="clock" s={14} /> Trạng thái
          </div>
          <b style={{ fontSize: 20, display: 'block', marginTop: 4, color: '#16A34A' }}>Hoàn thành</b>
        </div>
        <div className="card" style={{ padding: '16px 14px', borderRadius: 16 }}>
          <div className="sub" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon n="zap" s={14} /> Điểm số
          </div>
          <b style={{ fontSize: 20, display: 'block', marginTop: 4, color: '#D97706' }}>{r.score ?? pct}đ</b>
        </div>
        <div className="card" style={{ padding: '16px 14px', borderRadius: 16 }}>
          <div className="sub" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon n="checkc" s={14} /> Số câu đúng
          </div>
          <b style={{ fontSize: 20, display: 'block', marginTop: 4, color: 'var(--primary)' }}>{r.correctAnswers}/{r.totalQuestions}</b>
        </div>
      </div>

      {r.feedback && (
        <div
          className="card mt16"
          style={{
            textAlign: 'left',
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
            border: '1px solid #DDD6FE',
            padding: '16px 20px',
            borderRadius: 16,
          }}
        >
          <div className="coach">
            <Mascot s={44} />
            <div className="bubble" style={{ background: '#FFFFFF', borderColor: '#C7D2FE' }}>
              <b>Nhận xét từ Vi AI:</b> {r.feedback}
            </div>
          </div>
        </div>
      )}

      <div className="btn-row mt16" style={{ gap: 12, maxWidth: 440, margin: '24px auto 0' }}>
        <button className="btn ghost" onClick={() => nav('/quiz')} style={{ flex: 1 }}>
          Làm Quiz khác
        </button>
        <button className="btn" onClick={() => nav('/dashboard')} style={{ flex: 1 }}>
          Về tổng quan
        </button>
      </div>
    </div>
  );
}

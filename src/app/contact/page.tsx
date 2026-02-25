'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, Send, CheckCircle, RefreshCw } from 'lucide-react';

function generateCaptchaCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function drawCaptcha(canvas: HTMLCanvasElement, code: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Fond avec léger gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f0f4ff');
  gradient.addColorStop(1, '#e8edf5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Lignes de bruit
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, 0.4)`;
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.bezierCurveTo(
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height
    );
    ctx.stroke();
  }

  // Points de bruit
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 150 + 50}, ${Math.random() * 150 + 50}, ${Math.random() * 150 + 50}, 0.5)`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dessiner chaque caractère avec rotation et couleur aléatoire
  const colors = ['#1e3a5f', '#2d5a27', '#5a1e1e', '#3b1e5a', '#1e5a5a'];
  const charWidth = width / (code.length + 1);

  for (let i = 0; i < code.length; i++) {
    ctx.save();
    const x = charWidth * (i + 0.7);
    const y = height / 2 + (Math.random() * 10 - 5);
    const angle = (Math.random() - 0.5) * 0.5;

    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `bold ${Math.floor(Math.random() * 6 + 24)}px monospace`;
    ctx.fillStyle = colors[i % colors.length];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code[i], 0, 0);
    ctx.restore();
  }
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refreshCaptcha = useCallback(() => {
    const code = generateCaptchaCode();
    setCaptchaCode(code);
    setCaptchaInput('');
    setCaptchaError('');
    return code;
  }, []);

  useEffect(() => {
    const code = refreshCaptcha();
    if (canvasRef.current) {
      drawCaptcha(canvasRef.current, code);
    }
  }, [refreshCaptcha]);

  useEffect(() => {
    if (canvasRef.current && captchaCode) {
      drawCaptcha(canvasRef.current, captchaCode);
    }
  }, [captchaCode]);

  const handleRefreshCaptcha = () => {
    const code = generateCaptchaCode();
    setCaptchaCode(code);
    setCaptchaInput('');
    setCaptchaError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaInput.toUpperCase() !== captchaCode) {
      setCaptchaError('Code incorrect. Veuillez réessayer.');
      handleRefreshCaptcha();
      return;
    }

    setLoading(true);

    // Simulate sending (will be replaced with actual email service later)
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Contactez-nous</h1>
          <p className="mt-2 text-gray-600">
            Une question ? Un problème ? On est là pour vous aider.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email</h3>
                  <p className="text-sm text-gray-600">
                    Utilisez le formulaire ci-contre pour nous écrire. Nous vous répondrons par email.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-purple-50 p-6">
              <h3 className="font-semibold text-gray-900">Temps de réponse</h3>
              <p className="mt-2 text-sm text-gray-600">
                Nous répondons généralement sous 24-48h ouvrées.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  Message envoyé !
                </h3>
                <p className="mt-2 text-gray-600">
                  Merci de nous avoir contacté. Nous vous répondrons dans les plus brefs délais.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', message: '' });
                    handleRefreshCaptcha();
                  }}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Comment pouvons-nous vous aider ?"
                  />
                </div>

                {/* Captcha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vérification anti-spam
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <canvas
                      ref={canvasRef}
                      width={180}
                      height={50}
                      className="rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      title="Nouveau code"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value);
                      setCaptchaError('');
                    }}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Recopiez le code ci-dessus"
                    autoComplete="off"
                  />
                  {captchaError && (
                    <p className="mt-1 text-sm text-red-600">{captchaError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Envoyer le message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Server, Shield, Zap, Clock, MousePointerClick, Sparkles, CreditCard, Headphones, Cloud, Settings, ArrowRight } from 'lucide-react'

function Home() {
  const features = [
    {
      icon: <MousePointerClick />,
      title: 'Zero Technical Skills',
      description: 'No coding, no servers, no command line. Just paste your API key and click deploy'
    },
    {
      icon: <Zap />,
      title: 'Deploy in 2 Minutes',
      description: 'From signup to running AI assistant in under 2 minutes. We handle all the complexity'
    },
    {
      icon: <Cloud />,
      title: 'Fully Managed Hosting',
      description: 'Premium cloud servers, automatic updates, and 24/7 uptime - all managed for you'
    },
    {
      icon: <CreditCard />,
      title: 'Pay with Crypto',
      description: 'Simple weekly pricing at 0.005 ETH on Base. No subscriptions, cancel anytime'
    },
    {
      icon: <Shield />,
      title: 'Your Keys, Your Data',
      description: 'Use your own API key - we never store or access your conversations'
    },
    {
      icon: <Headphones />,
      title: 'Instant Dashboard Access',
      description: 'Get a personal URL to your OpenClaw dashboard immediately after deployment'
    }
  ]

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>No-Code AI Hosting</span>
          </div>

          <h1>
            Deploy <span className="gradient-text">OpenClaw</span>
            <br />
            Without The Hassle
          </h1>

          <p className="hero-description">
            AutoClaw is the easiest way to host your own OpenClaw AI assistant.
            No servers to manage, no code to write, no technical knowledge required.
            Just connect, pay, and deploy - we handle everything else.
          </p>

          <div className="hero-buttons">
            <Link to="/create" className="btn btn-primary btn-large">
              <Zap size={20} />
              Start Deploying
              <ArrowRight size={20} />
            </Link>
            <a href="#features" className="btn btn-secondary">
              Learn More
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">0.005</span>
              <span className="stat-label">ETH / Week</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">2 min</span>
              <span className="stat-label">To Deploy</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">Base</span>
              <span className="stat-label">Network</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="floating-card">
            <div className="card-header">
              <div className="card-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="card-title">autoclaw</span>
            </div>
            <div className="card-body">
              <div className="terminal-line">
                <span className="prompt">1.</span> Connect wallet
              </div>
              <div className="terminal-line success">
                <span className="prompt">2.</span> Pay 0.005 ETH
              </div>
              <div className="terminal-line success">
                <span className="prompt">3.</span> Paste API key
              </div>
              <div className="terminal-line success">
                <span className="prompt">✓</span> Your OpenClaw is live!
              </div>
              <div className="terminal-line typing">
                <span className="prompt">→</span> <span className="cursor"></span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Why AutoClaw?</h2>
          <p>The simplest way to get your own AI assistant up and running</p>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Stupidly Simple</h2>
          <p>Three clicks to your own AI assistant</p>
        </motion.div>

        <div className="steps">
          <motion.div
            className="step"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="step-number">1</div>
            <h3>Connect Wallet</h3>
            <p>Link your wallet on Base network</p>
          </motion.div>

          <div className="step-arrow">→</div>

          <motion.div
            className="step"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="step-number">2</div>
            <h3>Pay & Paste</h3>
            <p>0.005 ETH + your Anthropic API key</p>
          </motion.div>

          <div className="step-arrow">→</div>

          <motion.div
            className="step"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="step-number">3</div>
            <h3>You're Live</h3>
            <p>Access your dashboard instantly</p>
          </motion.div>
        </div>
      </section>

      {/* What is OpenClaw */}
      <section className="features">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>What You Get</h2>
          <p>OpenClaw - the AI that actually does things</p>
        </motion.div>

        <div className="features-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="feature-icon"><Server /></div>
            <h3>50+ Integrations</h3>
            <p>WhatsApp, Telegram, Discord, Slack, Gmail, GitHub, Spotify, and more</p>
          </motion.div>

          <motion.div
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="feature-icon"><Settings /></div>
            <h3>Autonomous Tasks</h3>
            <p>Web browsing, file access, command execution - your AI works while you sleep</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Ready to Skip the Setup?</h2>
          <p>Let us handle the hosting while you enjoy your AI assistant</p>
          <Link to="/create" className="btn btn-primary btn-large">
            <Zap size={24} />
            Deploy in 2 Minutes
            <ArrowRight size={24} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src="/logo.png" alt="AutoClaw" />
            <span className="gradient-text">AutoClaw</span>
          </div>
          <p>No-code OpenClaw hosting on Base</p>
        </div>
      </footer>
    </div>
  )
}

export default Home

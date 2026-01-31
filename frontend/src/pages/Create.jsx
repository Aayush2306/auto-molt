import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { motion } from 'framer-motion'
import { Key, Loader2, CheckCircle, XCircle, ArrowRight, Wallet } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const PAYMENT_WALLET = import.meta.env.VITE_PAYMENT_WALLET || 'YOUR_SOLANA_WALLET_ADDRESS_HERE'
const HOSTING_PRICE_SOL = 0.1

function Create() {
  const navigate = useNavigate()
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()

  const [step, setStep] = useState(1) // 1: Connect, 2: Pay, 3: API Key, 4: Deploying, 5: Done
  const [apiKey, setApiKey] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [deploymentId, setDeploymentId] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState(null)
  const [progress, setProgress] = useState(0)
  const [paymentSignature, setPaymentSignature] = useState('')

  // Update step based on wallet connection
  useEffect(() => {
    if (connected && step === 1) {
      setStep(2)
    } else if (!connected && step > 1) {
      setStep(1)
    }
  }, [connected, step])

  // Poll deployment status
  useEffect(() => {
    if (!deploymentId || step !== 4) return

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status/${deploymentId}`)
        const data = await response.json()
        setDeploymentStatus(data)

        // Update progress based on status
        switch (data.status) {
          case 'pending':
            setProgress(10)
            break
          case 'creating_droplet':
            setProgress(30)
            break
          case 'waiting_for_droplet':
            setProgress(50)
            break
          case 'configuring_openclaw':
            setProgress(75)
            break
          case 'ready':
            setProgress(100)
            setStep(5)
            break
          case 'failed':
            setError(data.error_message || 'Deployment failed')
            setStep(3)
            break
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [deploymentId, step])

  const handlePayment = async () => {
    if (!publicKey) return

    setIsProcessing(true)
    setError('')

    try {
      // For devnet testing, we'll simulate the payment
      // In production, uncomment the actual transaction code

      /*
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(PAYMENT_WALLET),
          lamports: HOSTING_PRICE_SOL * LAMPORTS_PER_SOL,
        })
      )

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')
      setPaymentSignature(signature)
      */

      // Simulated payment for devnet
      setPaymentSignature('simulated_' + Date.now())

      setStep(3)
    } catch (err) {
      setError('Payment failed: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeploy = async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      setError('Please enter a valid Anthropic API key (starts with sk-ant-)')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropic_api_key: apiKey,
          wallet_address: publicKey?.toBase58(),
          payment_signature: paymentSignature,
          region: 'nyc3'
        })
      })

      const data = await response.json()

      if (data.deployment_id) {
        setDeploymentId(data.deployment_id)
        setStep(4)
      } else {
        throw new Error(data.detail || 'Failed to start deployment')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusText = () => {
    if (!deploymentStatus) return 'Initializing...'
    switch (deploymentStatus.status) {
      case 'pending':
        return 'Preparing your deployment...'
      case 'creating_droplet':
        return 'Spinning up your server...'
      case 'waiting_for_droplet':
        return 'Server is booting up...'
      case 'configuring_openclaw':
        return 'Installing your AI assistant...'
      case 'ready':
        return 'All done!'
      default:
        return deploymentStatus.status
    }
  }

  return (
    <div className="create-page">
      <motion.div
        className="create-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Deploy in Minutes</h1>
        <p className="subtitle">No servers, no code, no hassle - just your AI assistant</p>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-icon">
              {step > 1 ? <CheckCircle size={20} /> : '1'}
            </div>
            <span>Connect</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-icon">
              {step > 2 ? <CheckCircle size={20} /> : '2'}
            </div>
            <span>Pay</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <div className="step-icon">
              {step > 3 ? <CheckCircle size={20} /> : '3'}
            </div>
            <span>API Key</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>
            <div className="step-icon">
              {step > 4 ? <CheckCircle size={20} /> : '4'}
            </div>
            <span>Deploy</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          {/* Step 1: Connect Wallet */}
          {step === 1 && (
            <motion.div
              className="step-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Wallet size={48} className="step-icon-large" />
              <h2>Connect Your Wallet</h2>
              <p>Connect your Phantom wallet to continue</p>
              <WalletMultiButton />
            </motion.div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <motion.div
              className="step-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="payment-info">
                <h2>Weekly Hosting</h2>
                <div className="price">
                  <span className="amount">0.1</span>
                  <span className="currency">SOL</span>
                </div>
                <p className="price-note">7 days of dedicated hosting</p>

                <ul className="payment-features">
                  <li><CheckCircle size={16} /> Your own dedicated server</li>
                  <li><CheckCircle size={16} /> Zero setup required</li>
                  <li><CheckCircle size={16} /> We handle all the tech</li>
                  <li><CheckCircle size={16} /> Cancel anytime</li>
                </ul>

                <button
                  className="btn btn-primary btn-large"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay 0.1 SOL
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: API Key */}
          {step === 3 && (
            <motion.div
              className="step-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Key size={48} className="step-icon-large" />
              <h2>Enter Your API Key</h2>
              <p>Paste your Anthropic API key below</p>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="api-input"
                />
              </div>

              <p className="api-help">
                Get your API key from{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                  console.anthropic.com
                </a>
              </p>

              <button
                className="btn btn-primary btn-large"
                onClick={handleDeploy}
                disabled={isProcessing || !apiKey}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    Starting...
                  </>
                ) : (
                  <>
                    Deploy Now
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Step 4: Deploying */}
          {step === 4 && (
            <motion.div
              className="step-card deploying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 size={48} className="spin step-icon-large" />
              <h2>Setting Up Your Server</h2>
              <p className="status-text">{getStatusText()}</p>

              <div className="deploy-progress">
                <div
                  className="deploy-progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-percent">{progress}%</span>

              <p className="estimate-time">Estimated time: 3-5 minutes</p>

              {deploymentStatus?.ip_address && (
                <p className="ip-info">
                  Server IP: <code>{deploymentStatus.ip_address}</code>
                </p>
              )}
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {step === 5 && (
            <motion.div
              className="step-card success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle size={64} className="success-icon" />
              <h2>You're All Set!</h2>
              <p>Your AI assistant is now live and ready to use</p>

              {deploymentStatus?.dashboard_url && (
                <a
                  href={deploymentStatus.dashboard_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-large"
                >
                  Open Dashboard
                  <ArrowRight size={20} />
                </a>
              )}

              <button
                className="btn btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                View My Hosting
              </button>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <XCircle size={20} />
              {error}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default Create

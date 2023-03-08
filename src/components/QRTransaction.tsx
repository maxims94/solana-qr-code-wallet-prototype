import { clusterApiUrl, Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js"

import { createQR, encodeURL, TransactionRequestURLFields } from '@solana/pay'

import { useRef, useEffect, useState } from 'react'

import useInterval from '../hooks/useInterval'

const RECEIVER_ACCOUNT = '77Dn6Xm3MjpUyyAh318WtHFvAcLSPrwUChLbpM2Ngnm3'

type Props = Readonly<{
  account: string
}>

export default function QRTransaction({ account }: Props) {

  const txQrRef = useRef<HTMLDivElement>(null)

  const [performPolling, setPerformPolling] = useState(false)
  const [currentTxId, setCurrentTxId] = useState(undefined)


  useEffect(() => {
    
    // TODO: is called multiple times

    async function createTransaction() {

      const connection = new Connection(clusterApiUrl('devnet'))

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(account),
          toPubkey: new PublicKey(RECEIVER_ACCOUNT),
          lamports: LAMPORTS_PER_SOL * 0.01
        })
      )

      tx.feePayer = new PublicKey(RECEIVER_ACCOUNT)

      const latestBlockhash = await connection.getLatestBlockhash()
      tx.recentBlockhash = latestBlockhash.blockhash

      return tx
    }

    async function registerTransaction(tx: Transaction) {
      const serializedTx = tx.serialize({ requireAllSignatures: false })
      const encodedTx = serializedTx.toString('base64')

      const responseRaw = await fetch('/api/qr_transaction', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tx: encodedTx })
      })

      const response = await responseRaw.json()

      console.log(response)

      return response['tx_id']
    }

    async function prepTransaction() {
      const tx = await createTransaction()
      console.log(tx)

      const txId = await registerTransaction(tx)
      console.log(txId)
      return txId
    }

    prepTransaction().then(
      (txId) => {
        setCurrentTxId(txId)

        const { location } = window
        const url = `${location.protocol}//${location.host}/api/get_transaction?tx_id=${txId}`

        const urlFields: TransactionRequestURLFields = {
          link: new URL(url),
        }
        const txUrl = encodeURL(urlFields)
        const txQr = createQR(txUrl, 400, 'transparent')

        if (txQrRef.current) {
          txQrRef.current.innerHTML = ''
          txQr.append(txQrRef.current)
        }

      }, (error) => {
        console.log("Failed to prepare transaction:", error)
      }
    )

  }, [account])

  /*
  async function poll() {
    console.log("Polling...")

    const responseRaw = await fetch('/api/qr_transaction')

    if (!responseRaw.ok) {
      console.log("Request failed")
      return
    }

    const response = await responseRaw.json()
    console.log(response)

    // update current tx state
  }

  useInterval(poll, performPolling ? POLLING_INTERVAL : null)
  */

  return  (
    <div>
      <div>
        Logged in as {account}
      </div>
      <div>
        Scan this QR code to perform a transaction (send 0.01 SOL to a devnet account)
      </div>
      <div ref={txQrRef} />
    </div>
  )
}
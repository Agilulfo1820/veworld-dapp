import { useToast } from "@chakra-ui/react"
import { useState } from "react"
import { useWallet } from "../context/walletContext"
import { INonFungibleToken } from "../model/State"
import { TxStage } from "../model/Transaction"
import TransactionsService from "../service/TransactionsService"
import VIP181Service from "../service/VIP181Service"
import { getErrorMessage } from "../utils/ExtensionUtils"

const useMintNonFungibleToken = () => {
  const {
    state: { account },
  } = useWallet()
  const [txId, setTxId] = useState<string>()
  const [txStatus, setTxStatus] = useState(TxStage.NONE)
  const [error, setError] = useState<string>()
  const toast = useToast()

  const mintNonFungibleToken = async (
    nft: INonFungibleToken,
    toAddress: string,
    comment: string,
    clauseAmount: number
  ) => {
    setError(undefined)

    try {
      setTxStatus(TxStage.NONE)
      if (!account) throw new Error("You have not selected an account")

      const clauses = await VIP181Service.buildMintNftClause(
        toAddress,
        nft.address,
        clauseAmount
      )

      const clausesWithComments = clauses.map((clause) => {
        return { ...clause, comment }
      })

      setTxStatus(TxStage.IN_EXTENSION)

      const { txid } = await TransactionsService.requestTransaction(
        account.address,
        clausesWithComments
      )
      setTxId(txid)
      setTxStatus(TxStage.POLLING_TX)

      const receipt = await TransactionsService.pollForReceipt(txid)

      if (receipt.reverted) {
        const revertReason = await TransactionsService.explainRevertReason(txid)
        setTxStatus(TxStage.REVERTED)
        return toast({
          title: revertReason,
          status: "error",
          position: "bottom-left",
        })
      }

      setTxStatus(TxStage.COMPLETE)
    } catch (e) {
      console.error(e)
      setError(getErrorMessage(e))
      return toast({
        title: "Error minting token",
        status: "error",
        position: "bottom-left",
      })
    }
  }

  return { mintNonFungibleToken, error, txId, txStatus }
}

export default useMintNonFungibleToken

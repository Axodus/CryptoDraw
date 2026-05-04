/**
 * Utilitários para construção e verificação de Merkle Trees
 * Compatível com contratos Solidity - seção 4 da especificação
 * CryptoDraw - Sistema de Loteria Descentralizada
 */

import { ethers } from 'ethers';
import { GameType } from '../models/Ticket';

export interface TicketLeafData {
  ticketId: string;
  owner: string;
  game: number;
  numbersPacked: number;
  roundsBought: number;
  firstDrawId: number;
}

export interface MerkleTreeResult {
  root: string;
  tree: string[][];
  proofs: { [leaf: string]: string[] };
}

export class MerkleTree {
  /**
   * Gera hash da leaf conforme especificação
   * keccak256(abi.encodePacked(ticketId, owner, game, numbersPacked, roundsBought, firstDrawId))
   */
  static generateLeafHash(ticket: TicketLeafData): string {
    const encodedData = ethers.utils.solidityPack(
      ['uint256', 'address', 'uint8', 'uint256', 'uint256', 'uint256'],
      [
        ticket.ticketId,
        ticket.owner,
        ticket.game,
        ticket.numbersPacked,
        ticket.roundsBought,
        ticket.firstDrawId
      ]
    );
    
    return ethers.utils.keccak256(encodedData);
  }

  /**
   * Constrói árvore Merkle completa com proofs
   */
  static buildTree(leaves: string[]): MerkleTreeResult {
    if (leaves.length === 0) {
      throw new Error('Lista de leaves vazia');
    }

    // Ordena leaves para garantir determinismo
    const sortedLeaves = [...leaves].sort();
    
    // Constrói árvore de baixo para cima
    const tree: string[][] = [sortedLeaves];
    
    let currentLevel = sortedLeaves;
    
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        // Ordena hashes para garantir determinismo
        const [sortedLeft, sortedRight] = [left, right].sort();
        const parentHash = ethers.utils.keccak256(
          ethers.utils.concat([sortedLeft, sortedRight])
        );
        
        nextLevel.push(parentHash);
      }
      
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    const root = currentLevel[0];
    
    // Gera proofs para cada leaf
    const proofs: { [leaf: string]: string[] } = {};
    
    for (const leaf of sortedLeaves) {
      proofs[leaf] = this.generateProof(leaf, tree);
    }

    return {
      root,
      tree,
      proofs
    };
  }

  /**
   * Gera proof para uma leaf específica
   */
  private static generateProof(leaf: string, tree: string[][]): string[] {
    const proof: string[] = [];
    
    // Encontra índice da leaf no nível 0
    let currentIndex = tree[0].indexOf(leaf);
    if (currentIndex === -1) {
      throw new Error('Leaf não encontrada na árvore');
    }

    // Sobe pelos níveis coletando siblings
    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      const isRightNode = currentIndex % 2 === 1;
      
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verifica se uma proof é válida
   */
  static verifyProof(leaf: string, proof: string[], root: string): boolean {
    let currentHash = leaf;

    for (const siblingHash of proof) {
      // Ordena hashes para garantir determinismo
      const [sortedLeft, sortedRight] = [currentHash, siblingHash].sort();
      
      currentHash = ethers.utils.keccak256(
        ethers.utils.concat([sortedLeft, sortedRight])
      );
    }

    return currentHash === root;
  }

  /**
   * Converte ticket para formato de leaf data
   */
  static ticketToLeafData(ticket: {
    id: string;
    owner: string;
    game: GameType;
    numbersPacked: string;
    roundsBought: number;
    firstDrawId: number;
  }): TicketLeafData {
    return {
      ticketId: ticket.id,
      owner: ticket.owner,
      game: ticket.game,
      numbersPacked: parseInt(ticket.numbersPacked),
      roundsBought: ticket.roundsBought,
      firstDrawId: ticket.firstDrawId
    };
  }

  /**
   * Utilitário para debug - imprime árvore
   */
  static printTree(tree: string[][]): void {
    console.log('Merkle Tree:');
    tree.forEach((level, index) => {
      console.log(`Nível ${index}:`, level.map(hash => hash.slice(0, 10) + '...'));
    });
  }

  /**
   * Calcula número de níveis necessários para N leaves
   */
  static calculateTreeHeight(leafCount: number): number {
    if (leafCount <= 1) return 1;
    return Math.ceil(Math.log2(leafCount)) + 1;
  }

  /**
   * Verifica se árvore está balanceada
   */
  static isBalanced(tree: string[][]): boolean {
    if (tree.length === 0) return false;
    
    const expectedHeight = this.calculateTreeHeight(tree[0].length);
    return tree.length === expectedHeight;
  }
}
'use server';

import { pool } from '../db';
import { revalidatePath } from 'next/cache';

export async function getClients() {
  const client = await pool.connect();
  try {
    // Auto-migrate column if it doesn't exist
    try {
      await client.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR');
    } catch (e) {
      console.log('Skipping auto-migration or column already exists');
    }
    
    const res = await client.query('SELECT id, name, created_at, telegram_chat_id FROM clients ORDER BY name ASC');
    return res.rows;
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  } finally {
    client.release();
  }
}

export async function getNetworks() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT n.id, n.client_id, n.cidr::text as cidr, n.description, n.created_at, c.name as client_name
      FROM networks n
      JOIN clients c ON c.id = n.client_id
      ORDER BY c.name ASC, n.cidr ASC
    `);
    return res.rows;
  } catch (error) {
    console.error('Error fetching networks:', error);
    return [];
  } finally {
    client.release();
  }
}

export async function createClient(name: string, telegram_chat_id?: string) {
  if (!name || name.trim() === '') return { error: 'Nome é obrigatório' };
  
  const client = await pool.connect();
  try {
    const res = await client.query('INSERT INTO clients (name, telegram_chat_id) VALUES ($1, $2) RETURNING *', [name.trim(), telegram_chat_id || null]);
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, client: res.rows[0] };
  } catch (error) {
    console.error('Error creating client:', error);
    return { error: 'Erro ao criar organização' };
  } finally {
    client.release();
  }
}

export async function updateClientTelegram(id: number, telegram_chat_id: string | null) {
  const client = await pool.connect();
  try {
    const res = await client.query('UPDATE clients SET telegram_chat_id = $1 WHERE id = $2 RETURNING *', [telegram_chat_id, id]);
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, client: res.rows[0] };
  } catch (error) {
    console.error('Error updating client telegram:', error);
    return { error: 'Erro ao atualizar chat ID' };
  } finally {
    client.release();
  }
}

export async function createNetwork(clientId: number, cidr: string, description: string) {
  if (!clientId || !cidr || cidr.trim() === '') return { error: 'Campos obrigatórios faltando' };
  
  const client = await pool.connect();
  try {
    const res = await client.query(
      'INSERT INTO networks (client_id, cidr, description) VALUES ($1, $2::inet, $3) RETURNING *',
      [clientId, cidr.trim(), description.trim()]
    );
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, network: res.rows[0] };
  } catch (error: any) {
    console.error('Error creating network:', error);
    if (error.code === '22P02') {
      return { error: 'Formato CIDR inválido (ex: 192.168.1.0/24)' };
    }
    return { error: 'Erro ao criar rede' };
  } finally {
    client.release();
  }
}

export async function deleteNetwork(id: number) {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM networks WHERE id = $1', [id]);
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting network:', error);
    return { error: 'Erro ao deletar rede' };
  } finally {
    client.release();
  }
}

export async function deleteClient(id: number) {
  const client = await pool.connect();
  try {
    // Apaga as redes vinculadas primeiro
    await client.query('DELETE FROM networks WHERE client_id = $1', [id]);
    await client.query('DELETE FROM clients WHERE id = $1', [id]);
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { error: 'Erro ao deletar organização' };
  } finally {
    client.release();
  }
}

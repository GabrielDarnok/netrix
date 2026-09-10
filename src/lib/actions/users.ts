'use server';

import { pool } from '../db';
import { hashPassword, verifyPassword } from '../utils/password';
import { auth, unstable_update } from '@/auth';

export async function updateProfile(data: { name: string; currentPassword?: string; newPassword?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Não autorizado. Faça login novamente.' };
  }

  const userId = session.user.id;
  const client = await pool.connect();

  try {
    // Busca usuário atual para validar a senha caso ele queira trocar
    const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return { error: 'Usuário não encontrado.' };
    }
    
    const user = userRes.rows[0];

    // Se o usuário quer alterar a senha
    let passwordHashToUpdate = user.password_hash;
    if (data.newPassword) {
      if (!data.currentPassword) {
        return { error: 'Você precisa informar a senha atual para alterá-la.' };
      }
      
      const isValid = verifyPassword(data.currentPassword, user.password_hash);
      if (!isValid) {
        return { error: 'A senha atual está incorreta.' };
      }
      
      passwordHashToUpdate = hashPassword(data.newPassword);
    }

    // Atualiza o banco de dados
    await client.query(
      `UPDATE users SET name = $1, password_hash = $2 WHERE id = $3`,
      [data.name, passwordHashToUpdate, userId]
    );

    // Tenta forçar a renovação do token na sessão atual para que o frontend veja o novo nome
    try {
      await unstable_update({
        user: {
          name: data.name,
        }
      });
    } catch (e) {
      console.log("Could not update session automatically, user might need to relogin");
    }

    return { success: true, message: 'Perfil atualizado com sucesso!' };
  } catch (error: any) {
    console.error("Profile update error:", error);
    return { error: 'Erro ao atualizar o perfil. Tente novamente mais tarde.' };
  } finally {
    client.release();
  }
}

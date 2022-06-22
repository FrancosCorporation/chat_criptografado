package Exemplos;


import java.io.*;
import java.security.Key;
import javax.crypto.Cipher;

public class Descriptografador {
    public static void main(String[] args) throws Exception {

        ObjectInputStream arquivoChave = 
                new ObjectInputStream(new FileInputStream("Chave.key"));
        Key chave = (Key)arquivoChave.readObject();
        arquivoChave.close(); 
        
        Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, chave);
        
        System.out.println("Digite uma mensagem a ser cifrada: ");
        String mensagem = new java.util.Scanner(System.in).nextLine();
        
        byte[] bytesMensagem = mensagem.getBytes("UTF8");
        
        byte[] dadosCifrados = cipher.doFinal(bytesMensagem);
        
        System.out.println("Mensagem cifrada:" + new String(dadosCifrados));
        
        Cipher decipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        decipher.init(Cipher.DECRYPT_MODE, chave);
        
        byte[] dadosDecifrados = decipher.doFinal(dadosCifrados);
        
        System.out.println("Mensagem decifrada: " + new String(dadosDecifrados));
    }
    
}

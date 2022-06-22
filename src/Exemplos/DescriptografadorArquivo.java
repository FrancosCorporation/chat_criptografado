package Exemplos;


import java.io.FileInputStream;
import java.io.ObjectInputStream;
import java.security.Key;
import javax.crypto.Cipher;

public class DescriptografadorArquivo {
    public static void main(String[] args) throws Exception {
        Key chave;

        ObjectInputStream arquivoChave = 
                new ObjectInputStream( new FileInputStream("Chave.key"));
        chave = (Key)arquivoChave.readObject();
        arquivoChave.close(); 
        
        ObjectInputStream arquivoMensagem = 
                new ObjectInputStream( new FileInputStream("MensagemSecreta.des"));
        byte[] dadosCifrados = (byte[]) arquivoMensagem.readObject();
        arquivoMensagem.close();
        
        Cipher algoritmo = Cipher.getInstance("DES/ECB/PKCS5Padding");
        algoritmo.init(Cipher.DECRYPT_MODE, chave);
        
        byte[] dadosDecifrados = algoritmo.doFinal(dadosCifrados);
        
        System.out.println("Mensagem decifrada: " + new String(dadosDecifrados));
    }
    
}

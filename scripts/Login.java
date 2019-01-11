import java.awt.AWTException;
import java.awt.Robot;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.io.*;
import java.net.URL;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * A Java Robot to login to Chrome OS
 *
 * Based on the example by Alvin Alexander
 * here: https://alvinalexander.com/java/java-robot-class-example-mouse-keystroke
 */
public class Login
{
  public static String PASSWORD_FILENAME = "password.txt";

  private Robot robot;

  public static void main(String[] args) throws AWTException, URISyntaxException, IOException
  {
    new Login();
  }
  
  public Login() throws AWTException, URISyntaxException, IOException
  {
    // Create the robot
    this.robot = new Robot();
    // Wait 5 seconds
    robot.delay(5000);
    String password = loadPassword();
    // Type the password
    type(password);
    // Press Enter
    type(KeyEvent.VK_ENTER);
    // We are now logged in
    System.exit(0);
  }

  private String loadPassword() throws URISyntaxException, IOException {
    URI classLocation = getClass().getProtectionDomain().getCodeSource().getLocation().toURI();
    File file = new File( new File( new File(classLocation).getParent() ).getAbsolutePath() + File.separator + PASSWORD_FILENAME );
    BufferedReader br = new BufferedReader(new FileReader(file));
    String password = br.readLine();
    br.close();

    return password;
  }

  private void type(int i)
  {
    robot.delay(50);
    robot.keyPress(i);
    robot.keyRelease(i);
  }

  private void type(String s)
  {
    char[] chars = s.toCharArray();
    for (char c : chars)
    {
      Boolean capital = Character.isUpperCase(c);
      System.out.print(c);
      int code = KeyEvent.getExtendedKeyCodeForChar(c);
      robot.delay(50);
      if(capital) robot.keyPress(KeyEvent.VK_SHIFT);
      robot.keyPress(code);
      robot.keyRelease(code);
      if(capital) robot.keyRelease(KeyEvent.VK_SHIFT);
    }
  }
}
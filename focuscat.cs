public class FocusTimer : MonoBehaviour
{
    public float focusTime = 0f;  // 专注时间
    public float maxFocusTime = 25f;  // 最大专注时间（例如：番茄钟25分钟）
    public float minFocusTime = 5f;
    private bool isFocusing = false;

    // UI相关的显示组件
    public UnityEngine.UI.Text timerText;
    void Update()
    {
        if (isFocusing)
        {
            focusTime += Time.deltaTime;  // 增加专注时间
            timerText.text = Mathf.Round(focusTime).ToString();  // 更新UI显示
            
            if (focusTime >= maxFocusTime)
            {
                EndFocusSession();
            }
        }
    }

    public void StartFocusSession()
    {
        isFocusing = true;
        focusTime = 0f;
    }

    private void EndFocusSession()
    {
        isFocusing = false;
        // 完成专注后的奖励逻辑
        RewardPlayer();
    }

    private void RewardPlayer()
    {
        // 宠物成长或者奖励玩家
        Debug.Log("奖励玩家！宠物成长！");
    }
}

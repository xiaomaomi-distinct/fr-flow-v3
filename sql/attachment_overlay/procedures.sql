-- =============================================
-- 附件管理 - 数据库脚本
-- 数据库: common_db
-- 依赖表: ftp_file_record (已存在)
-- =============================================

DROP PROCEDURE IF EXISTS sp_attachment_delete;

CREATE PROCEDURE sp_attachment_delete(IN p_delete_id INT, IN p_operator_oa VARCHAR(50))
BEGIN
  UPDATE ftp_file_record
     SET curr_status = '2', del_operator = p_operator_oa
   WHERE id = p_delete_id AND curr_status = '1';
  SELECT JSON_OBJECT('success', TRUE, 'message', '删除成功', 'affected', ROW_COUNT()) AS result;
END;


DROP PROCEDURE IF EXISTS sp_attachment_delete_all;

CREATE PROCEDURE sp_attachment_delete_all(IN p_file_path_uuid VARCHAR(100), IN p_operator_oa VARCHAR(50))
BEGIN
  UPDATE ftp_file_record
     SET curr_status = '2', del_operator = p_operator_oa
   WHERE file_path_uuid = p_file_path_uuid AND curr_status = '1';
  SELECT JSON_OBJECT('success', TRUE, 'message', '删除成功', 'affected', ROW_COUNT()) AS result;
END;

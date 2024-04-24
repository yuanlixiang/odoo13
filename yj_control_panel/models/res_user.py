from odoo import api, models, fields


class Users(models.Model):
    _inherit = "res.users"

    @api.model
    def get_current_user_company(self):
        return self.env.user.company_id.id

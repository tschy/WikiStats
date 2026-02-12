package wikistats

import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath

@Disabled("Spring Boot tests are disabled for CLI-only app")
@SpringBootTest(classes = [WikiStatsSpringApplication::class])
@AutoConfigureMockMvc
class RevisionControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `revisions endpoint returns 200`() {
        mockMvc.perform(get("/api/revisions").param("title", "Earth"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.title").value("Earth"))
    }

    @Test
    fun `preview endpoint returns 200`() {
        mockMvc.perform(get("/api/preview").param("title", "Earth"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.title").value("Earth"))
    }
}
